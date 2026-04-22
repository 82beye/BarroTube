#!/usr/bin/env node

/**
 * BarroTube — 새 에피소드 생성 스크립트
 * Usage: node create-episode.js --channel <channel-id> --topic "<주제>" [--length <초>] [--notes "<요구사항>"]
 */

import { parseArgs } from 'node:util';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { registerIssue } from './register-paperclip-issue.js';

const WORKSPACE = resolve(import.meta.dirname, '../../workspace');

function generateEpisodeId() {
  const year = new Date().getFullYear();
  const episodesDir = join(WORKSPACE, 'episodes');

  if (!existsSync(episodesDir)) {
    mkdirSync(episodesDir, { recursive: true });
  }

  const existing = readdirSync(episodesDir)
    .filter(d => d.startsWith(`EP-${year}-`))
    .sort();

  const lastNum = existing.length > 0
    ? parseInt(existing[existing.length - 1].split('-')[2], 10)
    : 0;

  return `EP-${year}-${String(lastNum + 1).padStart(4, '0')}`;
}

function main() {
  const { values } = parseArgs({
    options: {
      channel: { type: 'string', short: 'c' },
      topic: { type: 'string', short: 't' },
      length: { type: 'string', short: 'l', default: '480' },
      notes: { type: 'string', short: 'n', default: '' },
    },
  });

  if (!values.channel || !values.topic) {
    console.error('Usage: node create-episode.js --channel <channel-id> --topic "<주제>"');
    console.error('Options:');
    console.error('  --channel, -c  채널 ID (예: econ-daily)');
    console.error('  --topic, -t    에피소드 주제');
    console.error('  --length, -l   목표 길이(초, 기본 480)');
    console.error('  --notes, -n    추가 요구사항');
    process.exit(1);
  }

  // 채널 존재 확인
  const channelDir = join(WORKSPACE, 'channels', values.channel);
  if (!existsSync(channelDir)) {
    console.error(`❌ Channel not found: ${values.channel}`);
    console.error(`   Expected directory: ${channelDir}`);
    process.exit(1);
  }

  const episodeId = generateEpisodeId();
  const episodeDir = join(WORKSPACE, 'episodes', episodeId);
  const targetLength = parseInt(values.length, 10);

  // 디렉터리 생성
  mkdirSync(join(episodeDir, '40_assets', 'images'), { recursive: true });
  mkdirSync(join(episodeDir, '40_assets', 'tts'), { recursive: true });

  // 00_brief.md 생성
  const brief = `---
episode_id: ${episodeId}
channel_id: ${values.channel}
created_at: ${new Date().toISOString()}
topic: "${values.topic}"
target_length_seconds: ${targetLength}
status: created
---

# Episode Brief

## 주제
${values.topic}

## 채널
${values.channel}

## 목표 길이
${targetLength}초 (${Math.round(targetLength / 60)}분)

## 운영자 요구사항
${values.notes || '없음'}

## 워크플로우
- [ ] S0: Brief 작성 ✅
- [ ] S1: CEO → PD 티켓 생성
- [ ] S2: Market Research
- [ ] S3: Strategy
- [ ] S4: Script
- [ ] S5: Fact Check
- [ ] S6: Asset Generation
- [ ] S7: CapCut Composition
- [ ] S8: QA Review
- [ ] S9: Metadata
- [ ] S10: Board Approval
- [ ] S11: Publish
`;

  writeFileSync(join(episodeDir, '00_brief.md'), brief, 'utf-8');

  // 상태 파일 초기화
  const status = {
    episode_id: episodeId,
    channel_id: values.channel,
    created_at: new Date().toISOString(),
    current_stage: 'S0',
    status: 'created',
    stage_history: [
      {
        stage: 'S0',
        status: 'completed',
        timestamp: new Date().toISOString(),
        actor: 'board',
      },
    ],
  };

  writeFileSync(
    join(episodeDir, '.episode_status.json'),
    JSON.stringify(status, null, 2),
    'utf-8'
  );

  console.log(`✅ Episode created successfully!`);
  console.log(`   ID:      ${episodeId}`);
  console.log(`   Channel: ${values.channel}`);
  console.log(`   Topic:   ${values.topic}`);
  console.log(`   Length:  ${targetLength}s (${Math.round(targetLength / 60)}min)`);
  console.log(`   Path:    ${episodeDir}`);

  // Paperclip Issue 자동 등록 (S1: 티켓 생성)
  console.log(`\n📎 Registering Paperclip issue...`);
  try {
    const registered = registerIssue(episodeId);
    if (registered) {
      console.log(`   → ${registered.identifier} (Producer 배정)`);
      console.log(`   → Paperclip 대시보드에서 진행 추적 가능`);
    } else {
      console.log(`   ⚠ 등록 실패 — 수동 재시도: node scripts/automation/register-paperclip-issue.js --episode ${episodeId}`);
    }
  } catch (e) {
    console.log(`   ⚠ 등록 에러 (파이프라인 계속 진행 가능): ${e.message}`);
  }

  console.log(`\n📋 Next: PD가 S2(Research) 이후 워크플로우 지휘`);
}

main();
