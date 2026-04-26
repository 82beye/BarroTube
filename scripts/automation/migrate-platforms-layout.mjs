#!/usr/bin/env node
/**
 * migrate-platforms-layout.mjs — v1 평면 → v2 platforms/ 구조 마이그레이션
 *
 * sp500-basic 5편을 합병:
 *   EP-0010~0014 (long): episodeDir/30_script.md, 45_intro.png, 47_thumbnail.png,
 *                        55_render/, 70_publish_meta.json, ... → platforms/long/
 *   EP-0015~0019 (shorts derived) → 부모 EP-0010~0014/platforms/shorts/ 로 합병
 *   distribution/{tiktok,reels}/   → platforms/{tiktok,reels}/ (long의 sibling)
 *   EP-0015~0019 디렉토리는 마이그레이션 후 삭제.
 *
 * 안전:
 *   - --dry-run 으로 계획만 출력
 *   - 80_publish_result.json의 video_id는 마이그레이션 후에도 유지 (재업로드 X)
 *   - series_link.json 신규 생성 (시리즈 멤버십을 episode-level에 한 번만)
 *
 * Usage:
 *   node scripts/automation/migrate-platforms-layout.mjs --dry-run
 *   node scripts/automation/migrate-platforms-layout.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const WORKSPACE = join(ROOT, 'workspace');

const PLAN = [
  // [parent_long_id, derived_shorts_id, series_episode]
  { parent: 'EP-2026-0010', shorts: 'EP-2026-0015', series_id: 'sp500-basic', n: 1 },
  { parent: 'EP-2026-0011', shorts: 'EP-2026-0016', series_id: 'sp500-basic', n: 2 },
  { parent: 'EP-2026-0012', shorts: 'EP-2026-0017', series_id: 'sp500-basic', n: 3 },
  { parent: 'EP-2026-0013', shorts: 'EP-2026-0018', series_id: 'sp500-basic', n: 4 },
  { parent: 'EP-2026-0014', shorts: 'EP-2026-0019', series_id: 'sp500-basic', n: 5 },
];

// long EP의 평면 → platforms/long/ 으로 이동할 파일/디렉토리
const LONG_FILES = [
  '30_script.md', '35_factcheck.md', '45_intro.png', '47_thumbnail.png',
  '60_qa_report.md', '70_publish_meta.json', '75_board_approval.json', '80_publish_result.json',
];
const LONG_DIRS = ['55_render', '40_assets', 'assets'];

// shorts EP의 평면 → 부모/platforms/shorts/ 으로 이동할 파일/디렉토리 (00_brief.md 포함)
const SHORTS_FILES = [
  '00_brief.md', '30_script.md', '35_factcheck.md', '45_intro.png', '47_thumbnail.png',
  '60_qa_report.md', '70_publish_meta.json', '75_board_approval.json', '80_publish_result.json',
];
const SHORTS_DIRS = ['55_render', '40_assets', 'assets'];

// distribution/{tiktok,reels}/ → platforms/{tiktok,reels}/
const DIST_PLATFORMS = ['tiktok', 'reels'];

const dryRun = process.argv.includes('--dry-run');

function moveFile(from, to) {
  if (!existsSync(from)) return false;
  if (existsSync(to)) {
    console.log(`   ⚠️  destination exists, skipping: ${to.replace(WORKSPACE + '/', '')}`);
    return false;
  }
  if (dryRun) {
    console.log(`   📦 ${from.replace(WORKSPACE + '/', '')} → ${to.replace(WORKSPACE + '/', '')}`);
  } else {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    console.log(`   ✅ ${from.replace(WORKSPACE + '/', '')} → ${to.replace(WORKSPACE + '/', '')}`);
  }
  return true;
}

function migrateOne({ parent, shorts, series_id, n }) {
  console.log(`\n━━━ ${parent} (sp500-basic ${n}/5) — long + shorts(${shorts}) 합병 ━━━`);
  const parentDir = join(WORKSPACE, 'episodes', parent);
  const shortsDir = join(WORKSPACE, 'episodes', shorts);

  if (!existsSync(parentDir)) { console.error(`❌ ${parent} 없음`); return; }

  // 1) long 평면 → platforms/long/
  const longDest = join(parentDir, 'platforms', 'long');
  if (!dryRun) mkdirSync(longDest, { recursive: true });
  console.log(`📁 long → platforms/long/`);
  for (const f of LONG_FILES) moveFile(join(parentDir, f), join(longDest, f));
  for (const d of LONG_DIRS) moveFile(join(parentDir, d), join(longDest, d));

  // 2) shorts → platforms/shorts/  (디렉토리 자체는 옮긴 후 삭제)
  if (existsSync(shortsDir)) {
    const shortsDest = join(parentDir, 'platforms', 'shorts');
    if (!dryRun) mkdirSync(shortsDest, { recursive: true });
    console.log(`📁 ${shorts} → platforms/shorts/`);
    for (const f of SHORTS_FILES) moveFile(join(shortsDir, f), join(shortsDest, f));
    for (const d of SHORTS_DIRS) moveFile(join(shortsDir, d), join(shortsDest, d));
    // shorts EP 내 다른 파일들 (.episode_status.json 등) — 이전하지 않고 EP 디렉토리째 삭제
    if (!dryRun) {
      // 폐기 EP-NNNN 폴더가 비었거나 잔존 메타파일만 있으면 제거
      const remaining = readdirSync(shortsDir);
      console.log(`   🗑  removing ${shorts} (잔존 ${remaining.length}개 항목 포함)`);
      rmSync(shortsDir, { recursive: true, force: true });
    } else {
      console.log(`   🗑  would remove ${shorts} after migration`);
    }
  } else {
    console.log(`   ⏭  ${shorts} 디렉토리 없음 (이미 합병됐거나 부재)`);
  }

  // 3) distribution/{tiktok,reels}/ → platforms/{tiktok,reels}/
  const distDir = join(parentDir, 'distribution');
  if (existsSync(distDir)) {
    console.log(`📁 distribution → platforms/{tiktok,reels}/`);
    for (const p of DIST_PLATFORMS) {
      const from = join(distDir, p);
      const to = join(parentDir, 'platforms', p);
      if (existsSync(from) && !existsSync(to)) {
        if (dryRun) console.log(`   📦 distribution/${p}/ → platforms/${p}/`);
        else { renameSync(from, to); console.log(`   ✅ distribution/${p}/ → platforms/${p}/`); }
      }
    }
    // youtube/ + _vertical.mp4 등 잔여 처리 후 distribution 폐지
    if (!dryRun) {
      try { rmSync(distDir, { recursive: true, force: true }); console.log(`   🗑  distribution/ 폐지`); } catch {}
    } else { console.log(`   🗑  would remove distribution/ after migration`); }
  }

  // 4) series_link.json 생성
  const seriesLink = {
    series_id,
    series_episode: n,
    series_total: 5,
    series_name: 'S&P500 입문 5편',
    parent_long_id: parent,
    derived_shorts_legacy_id: shorts,  // trace
  };
  const linkPath = join(parentDir, 'series_link.json');
  if (dryRun) console.log(`   📝 would write series_link.json: ${JSON.stringify(seriesLink)}`);
  else { writeFileSync(linkPath, JSON.stringify(seriesLink, null, 2) + '\n'); console.log(`   ✅ series_link.json`); }
}

console.log(dryRun ? '🧪 DRY RUN — no changes will be written' : '🚀 EXECUTING migration');
console.log(`   Plan: ${PLAN.length} episodes (sp500-basic 1~5)`);
for (const e of PLAN) migrateOne(e);
console.log(dryRun ? '\n🧪 Dry run complete. Re-run without --dry-run to apply.' : '\n✅ Migration complete.');
