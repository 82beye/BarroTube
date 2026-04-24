#!/usr/bin/env node

/**
 * generate-thumbnail.js — YouTube 썸네일 생성기
 *
 * Script frontmatter + hook scene narration + 00_brief.md topic을 바탕으로
 * YouTube 피드에서 클릭을 유도하는 썸네일 이미지를 생성.
 *
 * 일반 씬 이미지와 다른 점:
 *  - 큰 키워드·수치 텍스트가 핵심 (No-text 규칙 예외)
 *  - 캐릭터는 표정·포즈로 감정 전달 (놀람·환호·사고)
 *  - scene-backgrounds.md 팔레트 재사용 (에피소드 감정에 맞게)
 *
 * 출력: <episode_dir>/47_thumbnail.png
 *  - Long format: 1280×720 (YouTube 표준)
 *  - Shorts format: 1080×1920 (Shorts 썸네일)
 *
 * Usage:
 *   node generate-thumbnail.js --episode <dir>
 *   node generate-thumbnail.js --episode <dir> --palette bullish --keyword "90%" --force
 *
 * 참조 문서: workspace/channels/{channel}/intro-thumbnail-guide.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  generateImageGemini,
  loadCharacterDna,
  loadChannelStylePrefix,
  loadPalette,
  parseFrontmatter,
} from './generate-image-gemini.js';

const SERIES_DISPLAY_NAME = {
  'sp500-basic': 'S&P500 입문',
  'nasdaq100-basic': 'NASDAQ 100 입문',
};

const BRAND_TAGLINE = '3분이면 충분한 경제';

// role 기반 기본 팔레트 (Hook 씬의 role이 thumbnail emotion과 가장 가까움)
const ROLE_PALETTE_FALLBACK = {
  hook: 'bullish',
  data: 'bullish',
  insight: 'explainer',
  implication: 'wealth',
  wrap: 'cta',
};

function aspectForFormat(format) {
  return format === 'long-3min' ? '16:9' : '9:16';
}

function resolveStylePrefix(channel, format) {
  const suffix = format === 'long-3min' ? 'long' : 'shorts';
  const candidates = [
    resolve('workspace/channels', channel, `style-guide-${suffix}.md`),
    resolve('workspace/channels', channel, 'style-guide.md'),
  ];
  for (const sg of candidates) {
    if (existsSync(sg)) {
      const framing = loadChannelStylePrefix(sg);
      if (framing) return framing;
    }
  }
  return '';
}

function buildThumbnailPrompt({
  channel,
  format,
  seriesName,
  episodeN,
  episodeM,
  topic,
  hookNarration,
  keywordHint,
  paletteBlock,
}) {
  const dna = loadCharacterDna(channel);
  const framing = resolveStylePrefix(channel, format);

  const keywordDirective = keywordHint
    ? `Use this exact main message (pre-chosen): "${keywordHint}".`
    : `Choose the SINGLE most impactful keyword + number from the hook narration below (max 6 Korean characters + 1 number). Pick something that will stop a scroll on the YouTube feed.`;

  const thumbnailSpec = `
THUMBNAIL SPECIAL: this image is a YouTube thumbnail for the episode "${topic}".
Series badge (small, top-left corner): "${seriesName} ${episodeN}/${episodeM}" in clean small sans-serif.
Main hook text (CENTER, huge, unmissable): ${keywordDirective}
Render the main hook in extra-bold Korean-friendly sans-serif, keyword in black and number/percent in warm orange (#F4A261), BOTH with a thick white outline for contrast and a subtle drop shadow. The main hook must occupy roughly 25-35% of the frame height to be legible on a small YouTube feed thumbnail.
Small bottom tagline (bottom-center, compact): "${BRAND_TAGLINE}".
Character: the mascot positioned on one side, posed expressively to match the topic's emotion (surprised for shock values, confident thumbs-up for bullish, thoughtful hand-on-chin for complex, determined for risk).
Text-rule exception: the three text elements above (series badge, main hook, tagline) ARE allowed in this thumbnail; NO other text anywhere.
Background: follow the palette colors provided below; keep it ONE uniform flat color (no bottom strip, no split bar) except where the palette explicitly specifies a split.

Hook narration (for keyword extraction): "${hookNarration}"
`.trim();

  return [dna, framing, paletteBlock, thumbnailSpec].filter(Boolean).join('\n\n');
}

async function main() {
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

  if (!opts.episode) {
    console.error('Usage: generate-thumbnail.js --episode <dir> [--keyword "..."] [--palette NAME] [--force]');
    process.exit(1);
  }

  const epDir = resolve(opts.episode);
  const scriptPath = join(epDir, '30_script.md');
  const briefPath = join(epDir, '00_brief.md');
  if (!existsSync(scriptPath)) {
    console.error(`❌ Missing 30_script.md in ${epDir}`);
    process.exit(1);
  }

  const fm = parseFrontmatter(scriptPath);
  if (!fm) { console.error('❌ No frontmatter in script'); process.exit(1); }

  const format = fm.format || 'shorts';
  const channel = fm.channel_id;
  const seriesId = fm.series_id;
  const seriesN = fm.series_episode;
  const seriesM = fm.series_total || 5;
  const seriesName = SERIES_DISPLAY_NAME[seriesId] || seriesId || '';

  // topic extraction
  let topic = '';
  if (existsSync(briefPath)) {
    const brief = readFileSync(briefPath, 'utf-8');
    const m = brief.match(/^topic:\s*["']?(.+?)["']?\s*$/m);
    topic = m ? m[1].trim() : '';
  }

  // hook scene narration
  const hookScene = (fm.scenes || []).find(s => s.role === 'hook') || fm.scenes?.[0];
  const hookNarration = hookScene?.narration || '';

  // palette resolution
  const paletteName = opts.palette
    || ROLE_PALETTE_FALLBACK[hookScene?.role]
    || 'bullish';
  const paletteBlock = loadPalette(channel, paletteName);

  const outPath = join(epDir, '47_thumbnail.png');
  if (existsSync(outPath) && !opts.force) {
    console.log(`⏭  Thumbnail already exists at ${outPath}. Use --force to regenerate.`);
    process.exit(0);
  }

  const prompt = buildThumbnailPrompt({
    channel,
    format,
    seriesName,
    episodeN: seriesN,
    episodeM: seriesM,
    topic,
    hookNarration,
    keywordHint: opts.keyword || null,
    paletteBlock,
  });

  // Aspect: thumbnails match the format (YouTube accepts 16:9 for long, 9:16 for Shorts)
  const aspectRatio = aspectForFormat(format);

  console.log(`🖼  Generating thumbnail for ${fm.episode_id}`);
  console.log(`   Series: ${seriesName} [${seriesN}/${seriesM}]`);
  console.log(`   Topic: ${topic}`);
  console.log(`   Palette: ${paletteName}${opts.palette ? '' : ' (auto from role)'}`);
  if (opts.keyword) console.log(`   Keyword hint: ${opts.keyword}`);
  console.log(`   Format: ${format} → aspect=${aspectRatio}`);
  console.log(`   Out: ${outPath}`);

  try {
    await generateImageGemini({ prompt, outPath, aspectRatio, resolution: '1K' });
    console.log(`✅ Thumbnail saved: ${outPath}`);
  } catch (e) {
    console.error(`❌ Thumbnail generation failed: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
