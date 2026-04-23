#!/usr/bin/env node

/**
 * generate-image-gemini.js — Google Gemini Image API (Nano Banana 계열)
 *
 * Google AI Studio의 Gemini 3.1 Flash Image Preview (Nano Banana 2) 모델 사용.
 * 한국어 텍스트 렌더링, cartoon/illustration 품질이 FAL Recraft 계열 대비 우수.
 *
 * v1.1 (2026-04-23): format/style-guide 자동 분기 + force flag 수정
 *
 * Usage:
 *   node generate-image-gemini.js --prompt "..." --out scene.png [--aspect 9:16|16:9]
 *   node generate-image-gemini.js --script 30_script.md --out-dir assets/images/ [--force]
 *
 * 환경변수:
 *   GOOGLE_AI_API_KEY          (필수)
 *   GEMINI_IMAGE_MODEL         (선택, 기본: gemini-3.1-flash-image-preview)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parse as parseYAML } from 'yaml';
import { getSecret } from './config-loader.js';

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateImageGemini({ prompt, outPath, aspectRatio = '9:16', resolution = '2K', model = DEFAULT_MODEL }) {
  const apiKey = getSecret('GOOGLE_AI_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set in .env');

  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio, imageSize: resolution },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image gen failed: ${res.status} ${err.slice(0, 400)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData || p.inline_data);
  if (!imgPart) {
    throw new Error(`No image in response: ${JSON.stringify(data).slice(0, 400)}`);
  }

  const base64 = (imgPart.inlineData || imgPart.inline_data).data;
  const mime = (imgPart.inlineData || imgPart.inline_data).mimeType || 'image/png';
  const buffer = Buffer.from(base64, 'base64');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buffer);
  return { path: outPath, bytes: buffer.length, mime };
}

function parseFrontmatter(mdPath) {
  const content = readFileSync(mdPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('No YAML frontmatter');
  return parseYAML(match[1]);
}

function loadChannelStylePrefix(styleGuidePath) {
  const md = readFileSync(styleGuidePath, 'utf-8');
  const m = md.match(/###\s*Style Prefix[^\n]*\n```\n([\s\S]*?)\n```/);
  if (!m) return '';
  return m[1].trim();
}

function resolveStylePrefix(channel, format) {
  const suffix = format === 'long-3min' ? 'long' : 'shorts';
  const candidates = [
    resolve('workspace/channels', channel, `style-guide-${suffix}.md`),
    resolve('workspace/channels', channel, 'style-guide.md'),
  ];
  for (const sg of candidates) {
    if (existsSync(sg)) {
      const prefix = loadChannelStylePrefix(sg);
      if (prefix) return { prefix, path: sg };
    }
  }
  return { prefix: '', path: null };
}

function aspectForFormat(format) {
  return format === 'long-3min' ? '16:9' : '9:16';
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
      opts[key] = true;
      // boolean flag — do not consume next token
    } else {
      opts[key] = next;
      i++;
    }
  }

  try {
    if (opts.prompt && opts.out) {
      const aspectRatio = opts.aspect || '9:16';
      const r = await generateImageGemini({ prompt: opts.prompt, outPath: resolve(opts.out), aspectRatio });
      console.log(`✅ Image saved: ${opts.out} (${(r.bytes / 1024).toFixed(1)} KB, ${r.mime})`);
    } else if (opts.script && opts['out-dir']) {
      const meta = parseFrontmatter(opts.script);
      const outDir = resolve(opts['out-dir']);

      const format = meta.format || 'shorts';
      const aspectRatio = opts.aspect || aspectForFormat(format);
      const { prefix: stylePrefix, path: stylePath } = opts['style-prefix']
        ? { prefix: opts['style-prefix'], path: '(CLI override)' }
        : resolveStylePrefix(meta.channel_id, format);

      mkdirSync(outDir, { recursive: true });

      const resolution = opts.resolution || '1K';
      console.log(`📐 Format=${format} → aspect=${aspectRatio}, resolution=${resolution}, model=${DEFAULT_MODEL}`);
      if (stylePath) console.log(`📋 Style prefix: ${stylePath.replace(process.cwd() + '/', '')}`);
      console.log(`🎨 Generating ${meta.scenes.length} images via Gemini...`);

      for (const scene of meta.scenes) {
        const outPath = join(outDir, `scene_${scene.scene_id}.png`);
        if (existsSync(outPath) && !opts.force) {
          console.log(`  ⏭  Scene ${scene.scene_id} exists (use --force to regen)`);
          continue;
        }
        const fullPrompt = stylePrefix ? `${stylePrefix}\n\n${scene.image_prompt}` : scene.image_prompt;
        await generateImageGemini({ prompt: fullPrompt, outPath, aspectRatio, resolution });
        console.log(`  ✅ Scene ${scene.scene_id}`);
      }
      console.log(`\n🎨 All images saved in ${outDir}`);
    } else {
      console.error('Usage: generate-image-gemini.js --prompt "..." --out path.png [--aspect 9:16|16:9]');
      console.error('   or: generate-image-gemini.js --script 30_script.md --out-dir assets/images/ [--force]');
      process.exit(1);
    }
  } catch (e) {
    console.error(`❌ Gemini image gen failed: ${e.message}`);
    process.exit(1);
  }
}
