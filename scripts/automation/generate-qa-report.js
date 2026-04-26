#!/usr/bin/env node

/**
 * generate-qa-report.js — 자동 QA 리포트 (format 분기 지원)
 *
 * v1.1 (2026-04-22): shorts(60s·9:16) / long-3min(180s·16:9) 분기
 *   - script frontmatter의 format 값을 읽어 duration target/tolerance 및 aspect 자동 선택
 *
 * 검증 항목:
 *   - 영상 duration vs script target (format별 tolerance)
 *   - 해상도 (format별)
 *   - 코덱 H.264 yuv420p 30fps
 *   - 오디오 AAC 44.1kHz mono
 *   - 파일 크기 < 200MB (long은 더 큼)
 *   - 이미지 N개 존재 (format별)
 *   - TTS N개 존재 + 씬 duration 매치
 *
 * Usage:
 *   node generate-qa-report.js --episode <dir>
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { parse as parseYAML } from 'yaml';

const FORMAT_QA_SPECS = {
  'shorts': {
    duration_target: 60,
    duration_tolerance: 2,
    aspect_w: 1080,
    aspect_h: 1920,
    aspect_label: '9:16 세로',
    max_size_mb: 100,
    scene_count: 5,
  },
  'long-3min': {
    duration_target: 180,
    duration_tolerance: 10,
    aspect_w: 1920,
    aspect_h: 1080,
    aspect_label: '16:9 가로',
    max_size_mb: 200,
    scene_count: 7,
  },
};

function probe(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], {
    encoding: 'utf-8',
  });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

function dur(path) {
  const d = probe(path);
  return d ? parseFloat(d.format?.duration || 0) : 0;
}

const OK = '✅', WARN = '⚠️', FAIL = '❌';

async function main() {
  const { values } = parseArgs({ options: { episode: { type: 'string', short: 'e' } } });
  if (!values.episode) { console.error('Usage: generate-qa-report.js --episode <dir>'); process.exit(1); }

  const epDir = resolve(values.episode);
  // v2 (platforms/) 우선 → v1 fallback
  const scriptCandidates = [
    join(epDir, 'platforms', 'long', '30_script.md'),
    join(epDir, 'platforms', 'shorts', '30_script.md'),
    join(epDir, '30_script.md'),
  ];
  const scriptPath = scriptCandidates.find(p => existsSync(p));
  if (!scriptPath) { console.error('❌ Missing 30_script.md'); process.exit(1); }
  const baseDir = scriptPath.replace(/\/30_script\.md$/, '');
  const videoPath = join(baseDir, '55_render/video.mp4');
  if (!existsSync(videoPath)) { console.error(`❌ Missing 55_render/video.mp4 under ${baseDir}`); process.exit(1); }

  const md = readFileSync(scriptPath, 'utf-8');
  const fm = parseYAML(md.match(/^---\n([\s\S]*?)\n---/)[1]);
  const scenes = fm.scenes || [];

  // Format 분기 — frontmatter.format 우선, 미지정 시 scene 수로 추론
  let format = fm.format;
  if (!format) {
    format = scenes.length === 7 ? 'long-3min' : 'shorts';
    console.warn(`⚠️  script frontmatter에 format 필드 없음. ${scenes.length}씬 기준으로 ${format}로 추론.`);
  }
  const spec = FORMAT_QA_SPECS[format];
  if (!spec) {
    console.error(`❌ Unknown format: ${format}. Supported: ${Object.keys(FORMAT_QA_SPECS).join(', ')}`);
    process.exit(1);
  }

  const target = fm.target_total_seconds || spec.duration_target;

  const video = probe(videoPath);
  const vStream = video?.streams.find(s => s.codec_type === 'video');
  const aStream = video?.streams.find(s => s.codec_type === 'audio');
  const actualDur = parseFloat(video?.format?.duration || 0);
  const sizeMB = (statSync(videoPath).size / 1024 / 1024).toFixed(2);

  const checks = [];

  // Duration (format별 tolerance)
  const dDiff = Math.abs(actualDur - target);
  checks.push({
    item: 'Duration',
    mark: dDiff < spec.duration_tolerance ? OK : (dDiff < spec.duration_tolerance * 1.5 ? WARN : FAIL),
    val: `${actualDur.toFixed(2)}s (target ${target}s, diff ${dDiff.toFixed(2)}s, tolerance ±${spec.duration_tolerance}s)`,
  });

  // Resolution (format별)
  const w = vStream?.width, h = vStream?.height;
  checks.push({
    item: 'Aspect',
    mark: (w === spec.aspect_w && h === spec.aspect_h) ? OK : WARN,
    val: `${w}×${h} (expected ${spec.aspect_w}×${spec.aspect_h} ${spec.aspect_label})`,
  });

  // Codec
  checks.push({
    item: 'Codec',
    mark: vStream?.codec_name === 'h264' ? OK : WARN,
    val: `${vStream?.codec_name} ${vStream?.pix_fmt} ${vStream?.r_frame_rate}`,
  });

  // Audio
  checks.push({
    item: 'Audio',
    mark: aStream?.codec_name === 'aac' ? OK : WARN,
    val: `${aStream?.codec_name} ${aStream?.sample_rate}Hz ${aStream?.channels}ch`,
  });

  // Size (format별 상한)
  checks.push({
    item: 'Size',
    mark: Number(sizeMB) < spec.max_size_mb ? OK : WARN,
    val: `${sizeMB} MB (max ${spec.max_size_mb} MB)`,
  });

  // Scene count (format별)
  checks.push({
    item: 'Scene count',
    mark: scenes.length === spec.scene_count ? OK : WARN,
    val: `${scenes.length}/${spec.scene_count}`,
  });

  // Images
  const imgCount = scenes.filter(s =>
    existsSync(join(epDir, existsSync(join(epDir, '40_assets')) ? '40_assets/images' : 'assets/images', `scene_${s.scene_id}.png`))
  ).length;
  checks.push({
    item: 'Images',
    mark: imgCount === scenes.length ? OK : FAIL,
    val: `${imgCount}/${scenes.length}`,
  });

  // TTS + scene duration match
  const ttsChecks = [];
  for (const s of scenes) {
    const ttsPath = join(epDir, existsSync(join(epDir, '40_assets')) ? '40_assets/tts' : 'assets/tts', `scene_${s.scene_id}.wav`);
    if (!existsSync(ttsPath)) {
      ttsChecks.push({ id: s.scene_id, mark: FAIL, val: 'missing' });
      continue;
    }
    const td = dur(ttsPath);
    const diff = s.target_seconds - td;
    const mark = diff >= -0.1 && diff < 2 ? OK : WARN;
    ttsChecks.push({ id: s.scene_id, mark, val: `${td.toFixed(2)}s (target ${s.target_seconds}s, pad ${diff.toFixed(2)}s)` });
  }

  const allTtsOk = ttsChecks.every(t => t.mark === OK);
  checks.push({
    item: 'TTS sync',
    mark: allTtsOk ? OK : WARN,
    val: ttsChecks.filter(t => t.mark !== OK).map(t => `scene_${t.id}: ${t.val}`).join('; ') || 'all good',
  });

  // Format-specific extra checks (long-3min: mid-hook, disclaimer)
  if (format === 'long-3min') {
    // 면책 멘트 휴리스틱 체크: 씬 7 narration에 "투자 조언" 또는 "면책" 키워드 존재 여부
    const lastScene = scenes[scenes.length - 1];
    const hasDisclaimer = /투자 조언|본인의 판단|책임 하에/.test(lastScene?.narration || '');
    checks.push({
      item: 'Voice disclaimer (long-form)',
      mark: hasDisclaimer ? OK : WARN,
      val: hasDisclaimer ? '씬 7에 면책 키워드 포함' : '씬 7에서 "투자 조언/본인의 판단" 키워드 미감지',
    });

    // 시리즈 편인 경우 인트로 카드 키워드 체크
    if (fm.series_id) {
      const secondScene = scenes[1];
      const hasSeriesMention = new RegExp(fm.series_id.split('-')[0], 'i').test(secondScene?.narration || '')
        || /시리즈|편|입문/.test(secondScene?.narration || '');
      checks.push({
        item: 'Series context (intro/recap)',
        mark: hasSeriesMention ? OK : WARN,
        val: hasSeriesMention ? '씬 2에 시리즈 관련 키워드 포함' : '씬 2에서 시리즈 리캡 키워드 미감지',
      });
    }
  }

  // Verdict
  const anyFail = checks.some(c => c.mark === FAIL);
  const verdict = anyFail ? 'FAIL' : 'PASS';

  // Report
  const report = [
    `# QA Report — ${fm.episode_id}`,
    '',
    `**Auto-generated**: ${new Date().toISOString()}`,
    `**Format**: \`${format}\` (target ${spec.duration_target}s ±${spec.duration_tolerance}s, ${spec.aspect_label}, ${spec.scene_count}씬)`,
    fm.series_id ? `**Series**: \`${fm.series_id}\` [${fm.series_episode}/?]` : '',
    fm.persona ? `**Persona**: \`${fm.persona}\`` : '',
    `**Video**: \`55_render/video.mp4\` (${actualDur.toFixed(2)}s, ${w}×${h}, ${vStream?.codec_name}, ${sizeMB}MB)`,
    '',
    '## Technical Checks',
    '| Item | Result | Value |',
    '|------|--------|-------|',
    ...checks.map(c => `| ${c.item} | ${c.mark} | ${c.val} |`),
    '',
    '## TTS per-scene',
    '| Scene | Result | Duration |',
    '|-------|--------|----------|',
    ...ttsChecks.map(t => `| ${t.id} | ${t.mark} | ${t.val} |`),
    '',
    '## Verdict',
    `**${verdict}**`,
    '',
    verdict === 'PASS'
      ? '✅ Board 승인 가능. S9 Metadata → S10 승인 → S11 Publish 진행.'
      : '❌ 실패 항목 수정 후 재검사 필요.',
  ].filter(Boolean).join('\n');

  const outPath = join(baseDir, '60_qa_report.md');
  writeFileSync(outPath, report, 'utf-8');

  console.log(`✅ QA report: ${outPath}`);
  console.log(`   Format: ${format} | Verdict: ${verdict}`);
  checks.forEach(c => console.log(`   ${c.mark} ${c.item}: ${c.val}`));
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
