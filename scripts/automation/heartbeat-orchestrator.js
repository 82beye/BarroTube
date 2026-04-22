#!/usr/bin/env node

/**
 * heartbeat-orchestrator.js — BarroTube 회사의 활성 에이전트들을 순회하며 heartbeat 실행
 *
 * Paperclip의 heartbeat는 단일 agent를 1회 trigger. 여러 에이전트를 주기적으로
 * 자동 실행하려면 외부 스케줄러가 필요 → 본 스크립트가 그 역할.
 *
 * 처리 흐름:
 *   1) BarroTube 회사의 agent list 조회
 *   2) runtimeConfig.heartbeat.enabled == true 이고 status != paused 필터
 *   3) 우선순위: Producer → Writer → Fact Checker → Asset PM → Image/Voice → CapCut → QA → Metadata → Publisher
 *   4) 각 agent heartbeat run (비동기 큐 제출)
 *   5) 결과 로그 → logs/heartbeat.log
 *
 * Usage:
 *   node heartbeat-orchestrator.js                   # 1회 실행
 *   node heartbeat-orchestrator.js --dry-run         # agent 목록만 출력
 *   node heartbeat-orchestrator.js --agent Producer  # 특정 에이전트만
 *   node heartbeat-orchestrator.js --timeout-ms 15000 # agent당 대기 (기본 15s)
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '../..');
const LOG_FILE = join(ROOT, 'logs', 'heartbeat.log');
const COMPANY_ID = '46041d31-43ca-4135-8db6-8a84ba0d22de';

// 우선순위 순서 (S0 → S11 흐름)
const PRIORITY_ORDER = [
  'CEO', 'Producer', 'Market Researcher', 'Strategist', 'Writer', 'Fact Checker',
  'Asset PM', 'Image Generator', 'Voice Engineer', 'CapCut Composer',
  'QA Reviewer', 'Metadata Writer', 'Publisher',
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    mkdirSync(resolve(ROOT, 'logs'), { recursive: true });
    appendFileSync(LOG_FILE, line + '\n', 'utf-8');
  } catch {}
}

function pcli(args, { timeout = 60000 } = {}) {
  const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || '/usr/bin:/bin'}` };
  const r = spawnSync('npx', ['--yes', 'paperclipai', ...args], {
    encoding: 'utf-8', env, timeout,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

async function main() {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      agent: { type: 'string', short: 'a' },
      'timeout-ms': { type: 'string', short: 't', default: '15000' },
      parallel: { type: 'boolean', default: false },   // 기본 직렬, --parallel 플래그로 병렬 허용
      'max-inflight': { type: 'string', default: '1' }, // 동시 진행 가능 에피소드 수 (기본 1)
    },
  });

  const timeout = parseInt(values['timeout-ms']);
  const maxInflight = parseInt(values['max-inflight']);
  const serial = !values.parallel; // 기본 직렬

  log(`🫀 Heartbeat orchestrator starting (timeout/agent=${timeout}ms, mode=${serial ? 'serial' : 'parallel'}, max-inflight=${maxInflight})`);

  // ─ Serialization gate ─────────────────────────────
  // 직렬 모드: in_progress BarroTube 에피소드 수 조회 → 한도 도달 시 Producer 건너뛰기
  let inflightCount = 0;
  if (serial) {
    const inprogRes = pcli(['issue', 'list', '--company-id', COMPANY_ID, '--status', 'in_progress', '--json']);
    if (inprogRes.status === 0) {
      try {
        const issues = JSON.parse(inprogRes.stdout);
        const btInflight = issues.filter(i => /^EP-\d{4}-\d{4}/.test(i.title));
        inflightCount = btInflight.length;
        if (inflightCount > 0) {
          log(`⏳ In-progress episodes (${inflightCount}): ${btInflight.map(i => i.identifier).join(', ')}`);
        }
      } catch { /* silent */ }
    }
  }

  const shouldSkipProducer = serial && inflightCount >= maxInflight;
  if (shouldSkipProducer) {
    log(`🔒 Serial gate — Producer/CEO skipped (${inflightCount}/${maxInflight} in progress)`);
  }

  // 1) agent list
  const listRes = pcli(['agent', 'list', '--company-id', COMPANY_ID, '--json']);
  if (listRes.status !== 0) {
    log(`❌ agent list 실패: ${listRes.stderr.slice(-200)}`);
    process.exit(1);
  }
  let agents;
  try { agents = JSON.parse(listRes.stdout); }
  catch { log(`❌ agent list JSON 파싱 실패`); process.exit(1); }

  // 2) 필터 + 정렬
  const eligible = agents
    .filter(a => a.runtimeConfig?.heartbeat?.enabled && a.status !== 'paused')
    .sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a.name);
      const bi = PRIORITY_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const targets = values.agent
    ? eligible.filter(a => a.name.toLowerCase().includes(values.agent.toLowerCase()))
    : eligible.filter(a => {
        // Serial 모드: Producer·CEO는 inflight 도달 시 heartbeat 건너뜀 (새 이슈 픽업 방지)
        // Writer/Asset/Image/Voice/CapCut/QA/Metadata/Publisher는 항상 heartbeat (진행 중 작업 완료를 도움)
        if (shouldSkipProducer && /^(CEO|Producer)$/i.test(a.name)) return false;
        return true;
      });

  if (values['dry-run']) {
    log(`🔍 Dry-run — would heartbeat ${targets.length}/${eligible.length} agents:`);
    targets.forEach(a => log(`  · ${a.name} (${a.id.slice(0, 8)}...) [${a.status}]`));
    return;
  }

  if (targets.length === 0) {
    log(`⚠ heartbeat 대상 agent 없음`);
    return;
  }

  log(`🎯 Targets: ${targets.map(a => a.name).join(', ')}`);

  // 3) 순차 heartbeat
  let success = 0, skip = 0, fail = 0;
  for (const agent of targets) {
    log(`  ▶ ${agent.name} heartbeat...`);
    const r = pcli([
      'heartbeat', 'run',
      '--agent-id', agent.id,
      '--source', 'automation',
      '--trigger', 'ping',
      '--timeout-ms', String(timeout),
    ], { timeout: timeout + 5000 });

    // heartbeat run은 queued 상태에서 CLI timeout 가능 — 정상
    if (/queued|completed|running/i.test(r.stdout)) {
      log(`    ✅ ${agent.name} → heartbeat dispatched`);
      success++;
    } else if (/no assigned issue|no todo|nothing to do/i.test(r.stdout + r.stderr)) {
      log(`    ⏭  ${agent.name} — 할 일 없음`);
      skip++;
    } else {
      log(`    ⚠ ${agent.name} — ${(r.stderr || r.stdout).slice(0, 200)}`);
      fail++;
    }
  }

  log(`📊 완료 — dispatched ${success}, skip ${skip}, fail ${fail}`);
}

main().catch(e => { log(`❌ fatal: ${e.message}`); process.exit(1); });
