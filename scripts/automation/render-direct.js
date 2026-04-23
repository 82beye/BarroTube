#!/usr/bin/env node

/**
 * render-direct.js — ffmpeg 직접 렌더 (권장, CapCut 우회)
 *
 * 장점:
 *  - AppleScript/접근성 권한 불필요
 *  - 완전 자동화 (헤드리스)
 *  - 재현성 100%
 *  - CapCut은 인간 QA/편집 용도로만 사용
 *
 * 입력: 에피소드 디렉토리 (scenes + tts + bgm + script)
 * 출력: mp4 (1080x1920 9:16, H.264, 30fps, AAC)
 *
 * Usage:
 *   node render-direct.js --episode <episode_dir> --out <output.mp4>
 *
 * 에피소드 구조 기대:
 *   <episode_dir>/30_script.md              (YAML frontmatter 파싱)
 *   <episode_dir>/assets/images/scene_NNN.png
 *   <episode_dir>/assets/tts/scene_NNN.wav
 *   <episode_dir>/assets/bgm.wav            (선택)
 */

import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { parse as parseYAML } from 'yaml';

function parseFrontmatter(mdPath) {
  const content = readFileSync(mdPath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No YAML frontmatter in ${mdPath}`);
  return parseYAML(match[1]);
}

function hasFfmpeg() {
  const r = spawnSync('which', ['ffmpeg']);
  return r.status === 0;
}

function probeDuration(mediaPath) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mediaPath], {
    encoding: 'utf-8',
  });
  if (r.status !== 0) return 0;
  return parseFloat(r.stdout.trim()) || 0;
}

/**
 * Scene 단위로 이미지+TTS를 mp4 클립으로 렌더
 */
/**
 * 나레이션을 문장 단위로 분할 (., ?, !, 및 긴 쉼표 기준)
 * 각 phrase에 시간 배분 (char 비율)
 */
function splitNarrationByTime(narration, totalSec) {
  const phrases = narration
    .split(/(?<=[.!?])\s+/)
    .flatMap(p => {
      // 한 문장도 60자 넘으면 쉼표 기준 재분할
      if (p.length > 60 && p.includes(',')) {
        return p.split(/(?<=,)\s*/).map(s => s.trim()).filter(Boolean);
      }
      return p.trim() ? [p.trim()] : [];
    });

  if (phrases.length === 0) return [];
  const totalChars = phrases.reduce((a, p) => a + p.length, 0);
  let t = 0;
  return phrases.map(p => {
    const dur = (p.length / totalChars) * totalSec;
    const entry = { text: p, start: t, end: t + dur };
    t += dur;
    return entry;
  });
}

function renderSubtitlePng(text, outPath) {
  const pyBin = join(process.env.HOME, 'youtube-co/.venv/bin/python3');
  const script = join(process.env.HOME, 'youtube-co/scripts/automation/render-subtitle.py');
  if (!existsSync(pyBin) || !existsSync(script)) return null;
  const r = spawnSync(pyBin, [script, text, outPath], { stdio: 'pipe' });
  if (r.status !== 0) return null;
  return outPath;
}

function renderScene({ imagePath, ttsPath, durationSec, narration, workDir, sceneId, outPath, canvasW = 1080, canvasH = 1920 }) {
  // 나레이션을 시간 기반 phrase로 분할 → 자막 PNG 여러 개 생성 → 시간 오버레이
  const phrases = narration ? splitNarrationByTime(narration, durationSec) : [];
  const overlays = [];
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const png = join(workDir, `sub_${sceneId}_${i}.png`);
    if (renderSubtitlePng(p.text, png)) {
      overlays.push({ png, start: p.start, end: p.end });
    }
  }

  const args = ['-y', '-loop', '1', '-i', imagePath, '-i', ttsPath];
  overlays.forEach(o => args.push('-loop', '1', '-i', o.png));

  // Subtitle bottom margin — Shorts needs 480px for YouTube UI; Long-form only 100px
  // (heuristic: vertical canvas => Shorts, horizontal => Long-form)
  const isVertical = canvasH > canvasW;
  const subtitleBottomMargin = isVertical ? 480 : 100;

  let filter = `[0:v]scale=${canvasW}:${canvasH}:force_original_aspect_ratio=increase,crop=${canvasW}:${canvasH}[v0]`;
  overlays.forEach((o, i) => {
    const inIdx = i + 2; // 0=img, 1=audio, 2+=subs
    const inLabel = `v${i}`;
    const outLabel = `v${i + 1}`;
    filter += `;[${inLabel}][${inIdx}:v]overlay=(W-w)/2:H-h-${subtitleBottomMargin}:enable='between(t,${o.start.toFixed(2)},${o.end.toFixed(2)})'[${outLabel}]`;
  });
  const finalLabel = overlays.length > 0 ? `v${overlays.length}` : 'v0';

  args.push(
    '-filter_complex', filter,
    '-map', `[${finalLabel}]`,
    '-map', '1:a',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-t', String(durationSec),
    '-movflags', '+faststart',
    outPath,
  );

  const res = spawnSync('ffmpeg', args, { stdio: 'pipe' });
  if (res.status !== 0) {
    throw new Error(`ffmpeg scene render failed: ${res.stderr.toString().slice(-500)}`);
  }
  return outPath;
}

/**
 * 모든 씬 클립 concat
 */
function concatScenes(clipPaths, outPath) {
  const workDir = mkdtempSync(join(tmpdir(), 'bt-concat-'));
  const listFile = join(workDir, 'list.txt');
  writeFileSync(listFile, clipPaths.map(p => `file '${p}'`).join('\n'));

  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c', 'copy', outPath,
  ], { stdio: 'pipe' });

  if (res.status !== 0) {
    throw new Error(`ffmpeg concat failed: ${res.stderr.toString().slice(-500)}`);
  }
  return outPath;
}

/**
 * BGM 믹스
 */
function mixBgm(videoPath, bgmPath, outPath, bgmVolume = 0.15) {
  const res = spawnSync('ffmpeg', [
    '-y', '-i', videoPath, '-i', bgmPath,
    '-filter_complex', `[1:a]volume=${bgmVolume},aloop=loop=-1:size=2e9[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    outPath,
  ], { stdio: 'pipe' });

  if (res.status !== 0) {
    throw new Error(`ffmpeg bgm mix failed: ${res.stderr.toString().slice(-500)}`);
  }
  return outPath;
}

export function renderDirect({ episodeDir, outPath, canvas }) {
  if (!hasFfmpeg()) {
    throw new Error('ffmpeg not found. Install: brew install ffmpeg');
  }

  const scriptPath = join(episodeDir, '30_script.md');
  if (!existsSync(scriptPath)) throw new Error(`Missing ${scriptPath}`);

  const meta = parseFrontmatter(scriptPath);
  const scenes = meta.scenes || [];
  if (!scenes.length) throw new Error('No scenes in script');

  // Assets directory: prefer 40_assets (v1.1+), fallback to legacy assets/
  let assetsDir = join(episodeDir, '40_assets');
  if (!existsSync(assetsDir)) assetsDir = join(episodeDir, 'assets');
  if (!existsSync(assetsDir)) throw new Error(`Missing assets dir (tried 40_assets/ and assets/)`);

  // Canvas: explicit arg > format-based default
  const format = meta.format || 'shorts';
  const defaultCanvas = format === 'long-3min' ? 'horizontal' : 'vertical';
  const chosenCanvas = canvas || defaultCanvas;
  const canvasDim = chosenCanvas === 'vertical' ? [1080, 1920] : [1920, 1080];

  console.log(`📐 Format: ${format} → canvas=${chosenCanvas} (${canvasDim.join('x')}), assets=${assetsDir.replace(episodeDir + '/', '')}`);
  const workDir = mkdtempSync(join(tmpdir(), 'bt-render-'));
  const clipPaths = [];

  console.log(`🎬 Rendering ${scenes.length} scenes at ${canvasDim.join('x')}...`);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneId = scene.scene_id || String(i + 1).padStart(3, '0');
    const imagePath = join(assetsDir, 'images', `scene_${sceneId}.png`);
    const ttsPath = join(assetsDir, 'tts', `scene_${sceneId}.wav`);
    const clipPath = join(workDir, `clip_${sceneId}.mp4`);

    if (!existsSync(imagePath)) throw new Error(`Missing image: ${imagePath}`);
    if (!existsSync(ttsPath)) throw new Error(`Missing tts: ${ttsPath}`);

    // Use ACTUAL TTS duration for clip length + subtitle timing
    // (was: scene.target_seconds — produced up to 46s of silence across 7 scenes)
    const ttsDur = probeDuration(ttsPath);
    const durationSec = ttsDur > 0 ? ttsDur : (scene.target_seconds || 12);
    const targetNote = scene.target_seconds ? ` (script target ${scene.target_seconds}s)` : '';

    renderScene({
      imagePath,
      ttsPath,
      durationSec,
      narration: scene.narration || '',
      workDir,
      sceneId,
      outPath: clipPath,
      canvasW: canvasDim[0],
      canvasH: canvasDim[1],
    });

    clipPaths.push(clipPath);
    console.log(`  ✅ Scene ${sceneId} (${durationSec.toFixed(2)}s TTS${targetNote})`);
  }

  // Concat
  const concatPath = join(workDir, 'concat.mp4');
  console.log('🔗 Concatenating scenes...');
  concatScenes(clipPaths, concatPath);

  // BGM mix (optional)
  const bgmPath = join(assetsDir, 'bgm.wav');
  if (existsSync(bgmPath)) {
    console.log('🎵 Mixing BGM...');
    mixBgm(concatPath, bgmPath, outPath);
  } else {
    execSync(`cp "${concatPath}" "${outPath}"`);
  }

  const stats = execSync(`du -h "${outPath}" | cut -f1`).toString().trim();
  console.log(`\n✅ Rendered: ${outPath} (${stats})`);
  return outPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    opts[args[i].replace(/^--/, '')] = args[i + 1];
  }

  if (!opts.episode || !opts.out) {
    console.error('Usage: render-direct.js --episode <dir> --out <path.mp4> [--canvas vertical|horizontal]');
    console.error('  (canvas auto-inferred from script frontmatter.format if omitted)');
    process.exit(1);
  }

  try {
    renderDirect({
      episodeDir: resolve(opts.episode),
      outPath: resolve(opts.out),
      canvas: opts.canvas,
    });
  } catch (e) {
    console.error(`❌ Render failed: ${e.message}`);
    process.exit(1);
  }
}
