#!/usr/bin/env node

/**
 * register-paperclip-issue.js
 *
 * 에피소드를 Paperclip AI(BarroTube 회사)의 이슈로 등록한다.
 * - 이미 등록된 에피소드는 skip (idempotent)
 * - Producer 에이전트에게 기본 배정 (8f440921-...)
 * - 결과 issue ID를 .episode_status.json에 저장
 *
 * Usage:
 *   node register-paperclip-issue.js --episode EP-YYYY-NNNN
 *   node register-paperclip-issue.js --all-unregistered
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '../..');
const WORKSPACE = join(ROOT, 'workspace/episodes');

const PAPERCLIP_COMPANY_ID = '46041d31-43ca-4135-8db6-8a84ba0d22de'; // BarroTube
const DEFAULT_ASSIGNEE = '8f440921-8463-4127-a45e-0cb478334480';    // Producer (PD)

function getPaperclipBin() {
  // npx paperclipai — PATH 이슈 회피
  return { cmd: 'npx', prefix: ['--yes', 'paperclipai'] };
}

function extractTopic(briefContent) {
  const m = briefContent.match(/^topic:\s*"?([^"\n]+)"?/m);
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
}

function registerIssue(episodeId, { skipIfRegistered = true } = {}) {
  const epDir = join(WORKSPACE, episodeId);
  if (!existsSync(epDir)) {
    console.error(`❌ ${episodeId} 없음`);
    return null;
  }

  const briefPath = join(epDir, '00_brief.md');
  const statusPath = join(epDir, '.episode_status.json');

  if (!existsSync(briefPath)) {
    console.error(`❌ ${episodeId}/00_brief.md 없음`);
    return null;
  }

  // 기존 등록 여부 확인
  let status = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf-8')) : {};
  if (skipIfRegistered && status.paperclip?.issue_id) {
    console.log(`  ⏭  ${episodeId} 이미 등록됨: ${status.paperclip.identifier || status.paperclip.issue_id}`);
    return status.paperclip;
  }

  const brief = readFileSync(briefPath, 'utf-8');
  const topic = extractTopic(brief) || '(no topic)';
  const title = `${episodeId}: ${topic}`.slice(0, 200);

  const { cmd, prefix } = getPaperclipBin();
  const args = [
    ...prefix, 'issue', 'create',
    '--company-id', PAPERCLIP_COMPANY_ID,
    '--title', title,
    '--description', brief,
    '--assignee-agent-id', DEFAULT_ASSIGNEE,
    '--priority', 'high',
    '--status', 'todo',
    '--json',
  ];

  const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || '/usr/bin:/bin'}` };
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', env });

  if (r.status !== 0) {
    console.error(`❌ ${episodeId} issue 생성 실패:`);
    console.error(r.stderr.slice(-500));
    return null;
  }

  let issue;
  try { issue = JSON.parse(r.stdout); }
  catch { console.error(`❌ ${episodeId} JSON 파싱 실패`); console.error(r.stdout.slice(-300)); return null; }

  // .episode_status.json 업데이트
  status.paperclip = {
    issue_id: issue.id,
    identifier: issue.identifier,
    issue_number: issue.issueNumber,
    assignee_agent_id: issue.assigneeAgentId,
    registered_at: new Date().toISOString(),
  };
  writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');

  console.log(`  ✅ ${episodeId} → ${issue.identifier} (${issue.id.slice(0, 8)}...)`);
  return status.paperclip;
}

const VALID_ISSUE_STATUS = new Set(['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done']);

function readEpisodeIssueId(episodeId) {
  const statusPath = join(WORKSPACE, episodeId, '.episode_status.json');
  if (!existsSync(statusPath)) return null;
  try {
    const s = JSON.parse(readFileSync(statusPath, 'utf-8'));
    return s.paperclip?.issue_id || null;
  } catch { return null; }
}

function updateIssueStatus(episodeId, nextStatus, { comment = null, silent = false } = {}) {
  if (!VALID_ISSUE_STATUS.has(nextStatus)) {
    throw new Error(`Invalid issue status: ${nextStatus}`);
  }
  const issueId = readEpisodeIssueId(episodeId);
  if (!issueId) {
    if (!silent) console.log(`  ⏭  ${episodeId} no paperclip issue_id — skipping status=${nextStatus}`);
    return null;
  }

  const { cmd, prefix } = getPaperclipBin();
  const args = [...prefix, 'issue', 'update', issueId, '--status', nextStatus, '--json'];
  if (comment) { args.push('--comment', comment); }

  const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || '/usr/bin:/bin'}` };
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', env });

  if (r.status !== 0) {
    if (!silent) {
      console.warn(`  ⚠ ${episodeId} issue status update (${nextStatus}) failed: ${r.stderr.slice(-200).trim()}`);
    }
    return null;
  }

  if (!silent) console.log(`  🔄 ${episodeId} issue → ${nextStatus}`);
  try { return JSON.parse(r.stdout); } catch { return { status: nextStatus }; }
}

async function main() {
  const { values } = parseArgs({
    options: {
      episode: { type: 'string', short: 'e' },
      'all-unregistered': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });

  if (values.episode) {
    const r = registerIssue(values.episode, { skipIfRegistered: !values.force });
    if (!r) process.exit(1);
    return;
  }

  if (values['all-unregistered']) {
    const eps = existsSync(WORKSPACE) ? readdirSync(WORKSPACE).filter(d => d.startsWith('EP-')).sort() : [];
    console.log(`🔍 Scanning ${eps.length} episodes for registration...`);
    let registered = 0, skipped = 0, failed = 0;
    for (const ep of eps) {
      const r = registerIssue(ep, { skipIfRegistered: !values.force });
      if (!r) failed++;
      else if (r.registered_at && Date.parse(r.registered_at) >= Date.now() - 60000) registered++;
      else skipped++;
    }
    console.log(`\n📊 Done — 신규 ${registered}, 기존 ${skipped}, 실패 ${failed}`);
    return;
  }

  console.error('Usage: register-paperclip-issue.js --episode EP-YYYY-NNNN');
  console.error('   or: register-paperclip-issue.js --all-unregistered');
  process.exit(1);
}

export { registerIssue, updateIssueStatus, readEpisodeIssueId };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error('❌', e.message); process.exit(1); });
}
