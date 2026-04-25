#!/usr/bin/env node

/**
 * generate-intro.js — BarroTube 시리즈 인트로 카드 생성기
 *
 * 2초 정지 이미지로 영상 맨 앞에 prepend되는 시리즈 브랜드 카드를 생성.
 * Script frontmatter의 series_id / series_episode / series_total을 읽어
 * `📚 Barro 경제수업 · [SERIES_NAME] [N/M]` 배지가 포함된 인트로 카드를 렌더.
 *
 * Character DNA는 character-dna.md에서 자동 로드, framing은 format별
 * style-guide-{shorts,long}.md에서 로드. 두 블록 뒤에 INTRO 전용 지시를 붙여
 * Gemini 3.1 Flash Image Preview 호출.
 *
 * 출력: <episode_dir>/45_intro.png (1K 기본, format aspect ratio)
 *
 * Usage:
 *   node generate-intro.js --episode <dir>
 *   node generate-intro.js --episode <dir> --force   (기존 파일 덮어쓰기)
 *
 * 참조 문서: workspace/channels/{channel}/intro-thumbnail-guide.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  generateImageGemini,
  loadCharacterDna,
  loadChannelStylePrefix,
  parseFrontmatter,
} from './generate-image-gemini.js';

// 시리즈별 한국어 축약 이름 (배지 표기용). series_id에서 자동 유추도 가능.
const SERIES_DISPLAY_NAME = {
  'sp500-basic': 'S&P500 입문',
  'nasdaq100-basic': 'NASDAQ 100 입문',
};

function displaySeriesName(seriesId) {
  if (!seriesId) return '';
  return SERIES_DISPLAY_NAME[seriesId] || seriesId;
}

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

function buildIntroPrompt({ channel, format, seriesName, episodeN, episodeM }) {
  const dna = loadCharacterDna(channel);
  const framing = resolveStylePrefix(channel, format);

  const introSpec = `
INTRO CARD SPECIAL: this image is a 2-second brand intro card, NOT a regular scene.
Layout:
  • LEFT side (~40%): the mascot character in a friendly greeting/waving pose.
  • RIGHT side (~60%): a clean stacked text block composed of four lines, top to bottom:
      line 1: "📚 Barro 경제수업"   (medium weight, solid black)
      line 2: a thin horizontal orange (#F4A261) divider line, about 60% of the block width
      line 3: "${seriesName}"       (slightly larger, solid black)
      line 4: "[${episodeN}/${episodeM}]"  (smaller, solid warm orange #F4A261)
Background: flat cream (#FFF8EC), uniform top to bottom, no strips or bands anywhere.
Add two small orange five-point stars floating near the character as subtle accents.
The text must be crisp, Korean-friendly sans-serif, clearly legible even at small sizes.
Keep the composition minimal, balanced, and branded — this is a series-identity frame,
not a narrative scene. The only allowed text in the entire image is the four lines above.
`.trim();

  return [dna, framing, introSpec].filter(Boolean).join('\n\n');
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
    console.error('Usage: generate-intro.js --episode <dir> [--force]');
    process.exit(1);
  }

  const epDir = resolve(opts.episode);
  const scriptPath = join(epDir, '30_script.md');
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
  const seriesName = displaySeriesName(seriesId);

  // 가드: series_id/series_episode 둘 중 하나라도 없으면 환각 텍스트(undefined/5, ""/5 등)가
  // 인트로 카드에 박혀버린다. 인트로 카드는 시리즈 에피소드 전용 자산이므로,
  // 누락 시 명확하게 거부하고 호출자가 frontmatter를 수정하도록 한다.
  if (!seriesId || seriesN === undefined || seriesN === null) {
    console.error(`❌ Cannot generate intro card: series_id and series_episode are required in frontmatter.`);
    console.error(`   Current: series_id=${JSON.stringify(seriesId)}, series_episode=${JSON.stringify(seriesN)}`);
    console.error(`   Hint: derived shorts must carry series_id from parent. Re-derive or patch 30_script.md frontmatter.`);
    process.exit(2);
  }

  const outPath = join(epDir, '45_intro.png');
  if (existsSync(outPath) && !opts.force) {
    console.log(`⏭  Intro already exists at ${outPath}. Use --force to regenerate.`);
    process.exit(0);
  }

  const prompt = buildIntroPrompt({
    channel,
    format,
    seriesName,
    episodeN: seriesN,
    episodeM: seriesM,
  });

  const aspectRatio = aspectForFormat(format);

  console.log(`🎬 Generating intro card for ${fm.episode_id}`);
  console.log(`   Series: ${seriesName} [${seriesN}/${seriesM}]`);
  console.log(`   Format: ${format} → aspect=${aspectRatio}`);
  console.log(`   Out: ${outPath}`);

  try {
    await generateImageGemini({ prompt, outPath, aspectRatio, resolution: '1K' });
    console.log(`✅ Intro saved: ${outPath}`);
  } catch (e) {
    console.error(`❌ Intro generation failed: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
