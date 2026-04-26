#!/usr/bin/env node

/**
 * produce-episode.js — S4~S9b 원샷 체인 (shorts-style 콘텐츠용 경량 체인)
 *
 * 커버리지:
 *   S0 (brief) → [S2 Research 생략] → [S3 Strategy 생략]
 *     → S4 Script → S5 Factcheck 생략(⚠ 별도 gate 미구현, docs/ backlog) → S6~S9b
 *
 *   S2/S3는 의도적으로 건너뜀:
 *     - 00_brief.md + 05_topic_references.md 만으로 S4 진행
 *     - 장시간/조사 중심 에피소드는 run-episode.js (전체 S0~S11 파이프라인) 사용
 *
 * 실행 순서:
 *   1) S4  Script 생성           (Gemini)
 *   2) S6a TTS 생성              (ElevenLabs)
 *   3) S6b Duration sync         (script target_seconds → TTS 실길이)
 *   4) S6c Images 생성           (Gemini Nano Banana 2)
 *   5) S7  Render (mp4)          (ffmpeg + PIL subtitle)
 *   6) S7b CapCut 프로젝트       (draft_info.json)
 *   7) S8  QA Report (자동)      (ffprobe 기반)
 *   8) S9  Metadata (Gemini)     + SEO 3-layer 자동 보강
 *
 * 상태 전이 (Paperclip 이슈):
 *   시작 → in_progress, 성공 종료 → in_review (Board 승인 대기), 실패 → blocked
 *
 * 중단 후 재실행: 각 단계 산출물 존재 시 skip (--force 로 전 단계 재생성).
 * S4~S9b 각 단계의 stage_start/complete/failed 는 .episode_status.json 및 logs/audit/YYYY-MM-DD.jsonl 에 기록됨.
 *
 * Usage:
 *   node produce-episode.js --episode EP-2026-0009
 *   node produce-episode.js --episode EP-2026-0009 --force        # 모든 단계 재생성 (자산 재과금 주의)
 *   node produce-episode.js --episode EP-2026-0009 --skip-capcut  # CapCut draft 생성 skip
 *
 * 관련 플래그 (run-episode.js):
 *   --force-republish — S11 중복 업로드 방지 해제 (이 스크립트와 무관, S11 범위)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { parse as parseYAML } from 'yaml';
import { updateIssueStatus } from './register-paperclip-issue.js';
import { resolvePaths, formatToPlatform } from './paths.js';

const ROOT = resolve(import.meta.dirname, '../..');
const LOGS = join(ROOT, 'logs');

function auditLog(episodeId, action, details = {}) {
  try {
    const logDir = join(LOGS, 'audit');
    mkdirSync(logDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const logFile = join(logDir, `${date}.jsonl`);
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      episode_id: episodeId,
      action,
      ...details,
    });
    appendFileSync(logFile, entry + '\n', 'utf-8');
  } catch (e) {
    console.warn(`  ⚠ auditLog failed: ${e.message}`);
  }
}

function updateStageStatus(episodeDir, episodeId, stageId, status, details = {}) {
  try {
    const statusFile = join(episodeDir, '.episode_status.json');
    const data = existsSync(statusFile)
      ? JSON.parse(readFileSync(statusFile, 'utf-8'))
      : { episode_id: episodeId, stage_history: [] };
    data.stage_history = data.stage_history || [];
    data.stage_history.push({
      stage: stageId,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    });
    data.last_updated = new Date().toISOString();
    data.current_stage = stageId;
    data.status = status;
    writeFileSync(statusFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`  ⚠ updateStageStatus failed: ${e.message}`);
  }
}

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ node ${cmd} ${args.join(' ')}`);
  const r = spawnSync('node', [cmd, ...args], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${label} 실패 (exit ${r.status})`);
}

function runTracked(episodeDir, episodeId, stageId, label, agent, cmd, args) {
  auditLog(episodeId, 'stage_start', { stage: stageId, agent });
  updateStageStatus(episodeDir, episodeId, stageId, 'in_progress', { agent });
  try {
    run(label, cmd, args);
    auditLog(episodeId, 'stage_complete', { stage: stageId, agent });
    updateStageStatus(episodeDir, episodeId, stageId, 'completed', { agent });
  } catch (e) {
    auditLog(episodeId, 'stage_failed', { stage: stageId, agent, error: e.message });
    updateStageStatus(episodeDir, episodeId, stageId, 'failed', { agent, error: e.message });
    throw e;
  }
}

function exists(p) { return existsSync(p); }

async function main() {
  const { values } = parseArgs({
    options: {
      episode: { type: 'string', short: 'e' },
      platform: { type: 'string' },           // long | shorts (v2 멀티 플랫폼 빌드 시 명시)
      force: { type: 'boolean', default: false },
      'skip-capcut': { type: 'boolean', default: false },
    },
  });
  if (!values.episode) {
    console.error('Usage: produce-episode.js --episode EP-YYYY-NNNN [--platform long|shorts] [--force] [--skip-capcut]');
    process.exit(1);
  }

  // --episode 가 ID 만인지 경로인지 처리
  let epDir = values.episode;
  if (!epDir.startsWith('/') && !epDir.startsWith('workspace/')) {
    epDir = join('workspace/episodes', values.episode);
  }
  const absEp = resolve(ROOT, epDir);
  if (!existsSync(absEp)) { console.error(`❌ Episode not found: ${absEp}`); process.exit(1); }

  // Brief 검색: --platform 명시 시 platforms/{platform}/00_brief.md 우선,
  // 없으면 episodeDir/00_brief.md (long 또는 v1 legacy).
  let briefPath;
  if (values.platform) {
    const v2 = join(absEp, 'platforms', values.platform, '00_brief.md');
    const root = join(absEp, '00_brief.md');
    briefPath = existsSync(v2) ? v2 : root;
  } else {
    const v2Long = join(absEp, 'platforms', 'long', '00_brief.md');
    const root = join(absEp, '00_brief.md');
    briefPath = existsSync(v2Long) ? v2Long : root;
  }
  if (!existsSync(briefPath)) { console.error(`❌ 00_brief.md 없음 (tried: ${briefPath})`); process.exit(1); }

  const force = values.force;
  const relEp = epDir;
  const episodeId = relEp.split('/').pop();

  // brief에서 format 추출 → 어느 platforms/{long|shorts}/ 디렉토리에 산출물을 둘지 결정.
  const briefRaw = readFileSync(briefPath, 'utf-8');
  const briefFM = (() => {
    const m = briefRaw.match(/^---\n([\s\S]*?)\n---/);
    return m ? parseYAML(m[1]) : {};
  })();
  const format = values.platform === 'shorts' ? 'shorts'
               : values.platform === 'long' ? 'long-3min'
               : (briefFM.format || 'long-3min');
  const platform = formatToPlatform(format);
  const p = resolvePaths(absEp, format);

  // v2 layout 보장: platforms/{platform}/ 디렉토리 미리 생성
  mkdirSync(p.base, { recursive: true });

  // 하위 스크립트에 --script/--out-dir 등을 절대 경로로 전달 (cwd 상관없이 동일하게 작동).
  const scriptArg = p.script;
  const ttsDirArg = p.ttsDir + '/';
  const imgDirArg = p.imagesDir + '/';
  const renderOutArg = p.video;

  console.log(`🎬 Produce episode: ${absEp}`);
  console.log(`   Format: ${format} → platform=${platform}, layout=${p.isV2 ? 'v2 (platforms/)' : 'v1 (legacy)'}`);
  console.log(`   Force: ${force}, Skip CapCut: ${values['skip-capcut']}`);

  auditLog(episodeId, 'produce_start', { force, skip_capcut: values['skip-capcut'], platform, layout: p.isV2 ? 'v2' : 'v1' });
  updateIssueStatus(episodeId, 'in_progress', { comment: 'produce-episode: S4~S9 chain started' });

  try {
    // S4 Script
    if (!exists(p.script) || force) {
      runTracked(absEp, episodeId, 'S4', 'S4 Script (Gemini)', '05-writer',
        'scripts/automation/generate-script.js', ['--episode', relEp]);
    } else {
      console.log(`\n⏭  S4 Script: ${p.script} 존재 (skip, --force로 재생성)`);
    }

    // S6a TTS
    const ttsDone = exists(join(p.ttsDir, 'scene_001.wav')) && exists(join(p.ttsDir, 'scene_005.wav'));
    if (!ttsDone || force) {
      runTracked(absEp, episodeId, 'S6a', 'S6a TTS (ElevenLabs)', '09-voice-engineer',
        'scripts/automation/generate-tts.js', [
          '--script', scriptArg,
          '--out-dir', ttsDirArg,
          '--force',
        ]);
    } else {
      console.log(`\n⏭  S6a TTS: 이미 있음 (skip)`);
    }

    // S6b Duration sync
    runTracked(absEp, episodeId, 'S6b', 'S6b Duration Sync', '09-voice-engineer',
      'scripts/automation/sync-durations.js', [
        '--script', scriptArg,
        '--tts-dir', ttsDirArg,
      ]);

    // S6c Images
    const imgDone = exists(join(p.imagesDir, 'scene_001.png')) && exists(join(p.imagesDir, 'scene_005.png'));
    if (!imgDone || force) {
      runTracked(absEp, episodeId, 'S6c', 'S6c Images (Nano Banana 2)', '08-image-generator',
        'scripts/automation/generate-image-gemini.js', [
          '--script', scriptArg,
          '--out-dir', imgDirArg,
          '--force',
        ]);
    } else {
      console.log(`\n⏭  S6c Images: 이미 있음 (skip)`);
    }

    // S6d Intro Card (series brand card, prepended to video)
    if (!exists(p.intro) || force) {
      runTracked(absEp, episodeId, 'S6d', 'S6d Intro Card (Gemini)', '08-image-generator',
        'scripts/automation/generate-intro.js', [
          '--episode', relEp,
          ...(force ? ['--force'] : []),
        ]);
    } else {
      console.log(`\n⏭  S6d Intro: 이미 있음 (skip)`);
    }

    // S6e Thumbnail (YouTube feed thumbnail)
    if (!exists(p.thumbnail) || force) {
      runTracked(absEp, episodeId, 'S6e', 'S6e Thumbnail (Gemini)', '08-image-generator',
        'scripts/automation/generate-thumbnail.js', [
          '--episode', relEp,
          ...(force ? ['--force'] : []),
        ]);
    } else {
      console.log(`\n⏭  S6e Thumbnail: 이미 있음 (skip)`);
    }

    // S7 Render
    mkdirSync(p.renderDir, { recursive: true });
    if (!exists(p.video) || force) {
      runTracked(absEp, episodeId, 'S7', 'S7 Render (ffmpeg + PIL subtitles)', '10-capcut-composer',
        'scripts/automation/render-direct.js', [
          '--episode', relEp,
          '--out', renderOutArg,
          '--canvas', platform === 'long' ? 'horizontal' : 'vertical',
        ]);
    } else {
      console.log(`\n⏭  S7 Render: ${p.video} 존재 (skip)`);
    }

    // S7b CapCut (optional)
    if (!values['skip-capcut']) {
      const capName = `BT-${episodeId}-Auto`;
      runTracked(absEp, episodeId, 'S7b', 'S7b CapCut Draft', '10-capcut-composer',
        'scripts/automation/build-capcut-from-episode.js', [
          '--episode', relEp,
          '--name', capName,
        ]);
    }

    // S8 QA
    runTracked(absEp, episodeId, 'S8', 'S8 QA Report (auto)', '11-qa-reviewer',
      'scripts/automation/generate-qa-report.js', ['--episode', relEp]);

    // S9 Metadata + SEO
    const metaPath = join(absEp, '70_publish_meta.json');
    if (!exists(metaPath) || force) {
      runTracked(absEp, episodeId, 'S9', 'S9 Metadata (Gemini)', '12-metadata-writer',
        'scripts/automation/generate-metadata.js', ['--episode', relEp]);
    } else {
      console.log(`\n⏭  S9 Metadata: 존재 (skip)`);
    }
    runTracked(absEp, episodeId, 'S9b', 'S9b SEO Enhance', '12-metadata-writer',
      'scripts/automation/seo-enhance.js', ['--episode', relEp, '--channel', 'econ-daily']);
  } catch (e) {
    auditLog(episodeId, 'produce_failed', { error: e.message });
    updateIssueStatus(episodeId, 'blocked', { comment: `produce-episode failed: ${e.message.slice(0, 200)}` });
    throw e;
  }

  auditLog(episodeId, 'produce_complete', {});
  updateIssueStatus(episodeId, 'in_review', { comment: 'S4~S9 complete — awaiting Board approval' });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ S4~S9 완료');
  console.log(`   📁 ${absEp}`);
  console.log('\n다음:');
  console.log(`   승인 (Telegram): /approve ${relEp.split('/').pop()}`);
  console.log(`   승인 (CLI):      node scripts/automation/approve-episode.js --episode ${relEp.split('/').pop()} --by "Board"`);
  console.log(`   배포 (auto):     run-episode.js가 S11 자동 실행`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
