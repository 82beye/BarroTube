#!/usr/bin/env node

/**
 * approve-episode.js — Board 승인 토큰 발행 (S10 게이트 해제)
 *
 * Usage:
 *   node approve-episode.js --episode EP-2026-0001 [--by "운영자이름"] [--note "..."]
 *
 * 승인 후: run-episode.js를 재실행하면 S10 통과 → S11 자동 진행
 */

import { parseArgs } from 'node:util';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { userInfo } from 'node:os';

const WORKSPACE = resolve(import.meta.dirname, '../../workspace');

const { values } = parseArgs({
  options: {
    episode: { type: 'string', short: 'e' },
    by: { type: 'string', short: 'b' },
    note: { type: 'string', short: 'n' },
  },
});

if (!values.episode) {
  console.error('Usage: node approve-episode.js --episode <EP-YYYY-NNNN> [--by <name>] [--note <text>]');
  process.exit(1);
}

const episodeDir = join(WORKSPACE, 'episodes', values.episode);
if (!existsSync(episodeDir)) {
  console.error(`❌ Episode not found: ${values.episode}`);
  process.exit(1);
}

// 선결조건: QA 리포트 + 메타데이터 + 렌더 존재
const required = [
  { path: '55_render/video.mp4', label: 'Rendered video' },
  { path: '60_qa_report.md', label: 'QA report' },
  { path: '70_publish_meta.json', label: 'Metadata' },
];

for (const r of required) {
  if (!existsSync(join(episodeDir, r.path))) {
    console.error(`❌ Missing: ${r.label} (${r.path})`);
    console.error(`   S10 승인은 S7~S9 완료 후에만 가능합니다.`);
    process.exit(1);
  }
}

// 메타/QA 간단 미리보기
const meta = JSON.parse(readFileSync(join(episodeDir, '70_publish_meta.json'), 'utf-8'));
const qa = readFileSync(join(episodeDir, '60_qa_report.md'), 'utf-8');

console.log(`\n📋 Episode: ${values.episode}`);
console.log(`   Title: ${meta.title || '(no title)'}`);
console.log(`   Tags: ${(meta.tags || []).join(', ')}`);
console.log(`   Privacy: ${meta.privacyStatus || 'public'}`);
console.log(`   Publish At: ${meta.publishAt || 'ASAP'}`);
console.log(`\n   QA Preview (first 10 lines):`);
console.log(qa.split('\n').slice(0, 10).map(l => `     ${l}`).join('\n'));

// 토큰 발행
const approval = {
  approved: true,
  approved_by: values.by || userInfo().username,
  approved_at: new Date().toISOString(),
  note: values.note || '',
  token: `BT-APPROVAL-${Date.now().toString(36).toUpperCase()}`,
};

writeFileSync(
  join(episodeDir, '75_board_approval.json'),
  JSON.stringify(approval, null, 2),
  'utf-8'
);

console.log(`\n✅ Approval token issued: ${approval.token}`);
console.log(`   Approved by: ${approval.approved_by}`);
console.log(`\n다음 단계: node scripts/automation/run-episode.js --episode ${values.episode}`);
console.log(`          (자동 재개 → S11 Publish)`);
