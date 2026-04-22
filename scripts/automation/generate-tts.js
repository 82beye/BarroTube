#!/usr/bin/env node

/**
 * generate-tts.js — ElevenLabs TTS 생성
 *
 * Usage:
 *   node generate-tts.js --text "나레이션 텍스트" --out path/scene_001.wav
 *   node generate-tts.js --script <episode_dir>/30_script.md --out-dir <assets>/tts/
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parse as parseYAML } from 'yaml';
import { getSecret } from './config-loader.js';

const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = '4JJwo477JUAx3HV0T7n7'; // Yohan Koo — Encouraging, Clear and Airy
const DEFAULT_MODEL = 'eleven_multilingual_v2';

export async function generateTTS({ text, outPath, voiceId = DEFAULT_VOICE_ID, model = DEFAULT_MODEL, settings = {} }) {
  const apiKey = getSecret('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set in .env');

  const voiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
    ...settings,
  };

  // Starter tier는 MP3만 가능. WAV가 필요하면 후처리로 ffmpeg 변환
  const url = `${API_URL}/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: model, voice_settings: voiceSettings }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${err}`);
  }

  const mp3 = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });

  // 확장자 기반: .wav이면 ffmpeg로 변환, .mp3이면 그대로 저장
  if (outPath.endsWith('.wav')) {
    const mp3Tmp = outPath.replace(/\.wav$/, '.tmp.mp3');
    writeFileSync(mp3Tmp, mp3);
    const { execSync } = await import('node:child_process');
    execSync(`ffmpeg -y -i "${mp3Tmp}" -ar 44100 -ac 1 -sample_fmt s16 "${outPath}" 2>/dev/null`);
    const { unlinkSync } = await import('node:fs');
    unlinkSync(mp3Tmp);
  } else {
    writeFileSync(outPath, mp3);
  }
  return { path: outPath, bytes: mp3.length };
}

function parseFrontmatter(mdPath) {
  const content = readFileSync(mdPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('No YAML frontmatter');
  return parseYAML(match[1]);
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
    } else {
      opts[key] = next;
      i++;
    }
  }

  try {
    if (opts.text && opts.out) {
      await generateTTS({ text: opts.text, outPath: resolve(opts.out) });
      console.log(`✅ TTS saved: ${opts.out}`);
    } else if (opts.script && opts['out-dir']) {
      const meta = parseFrontmatter(opts.script);
      const outDir = resolve(opts['out-dir']);
      mkdirSync(outDir, { recursive: true });
      console.log(`🎙 Generating ${meta.scenes.length} TTS clips...`);
      for (const scene of meta.scenes) {
        const outPath = join(outDir, `scene_${scene.scene_id}.wav`);
        if (existsSync(outPath) && !opts.force) {
          console.log(`  ⏭  Scene ${scene.scene_id} exists (use --force to regen)`);
          continue;
        }
        await generateTTS({ text: scene.narration, outPath });
        console.log(`  ✅ Scene ${scene.scene_id} (${scene.narration.slice(0, 30)}...)`);
      }
      console.log(`\n🎙 All TTS generated in ${outDir}`);
    } else {
      console.error('Usage: generate-tts.js --text "..." --out path/to/file.wav');
      console.error('   or: generate-tts.js --script 30_script.md --out-dir assets/tts/ [--force]');
      process.exit(1);
    }
  } catch (e) {
    console.error(`❌ TTS failed: ${e.message}`);
    process.exit(1);
  }
}
