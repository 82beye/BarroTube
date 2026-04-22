/**
 * Paperclip Extension: Budget Tracker
 * PRD §11: 에이전트별 월간 토큰/달러 한도 추적
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CONFIG_PATH = resolve(import.meta.dirname, '../config/budget-policy.json');
const DATA_DIR = resolve(import.meta.dirname, '../../logs/budget');

function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function getUsageFilePath(month) {
  return join(DATA_DIR, `usage-${month}.json`);
}

/**
 * 현재 월 사용량 로드
 */
function loadUsage(month = getCurrentMonth()) {
  const path = getUsageFilePath(month);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * 사용량 저장
 */
function saveUsage(usage, month = getCurrentMonth()) {
  ensureDataDir();
  writeFileSync(getUsageFilePath(month), JSON.stringify(usage, null, 2));
}

/**
 * 비용 기록
 */
export function recordCost(roleId, costUsd, details = {}) {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const roleConfig = config.budget_policy.roles[roleId];

  if (!roleConfig) {
    console.warn(`[Budget] Unknown role: ${roleId}`);
    return { allowed: true };
  }

  const month = getCurrentMonth();
  const usage = loadUsage(month);

  if (!usage[roleId]) {
    usage[roleId] = { total_usd: 0, calls: 0, history: [] };
  }

  usage[roleId].total_usd += costUsd;
  usage[roleId].calls += 1;
  usage[roleId].history.push({
    timestamp: new Date().toISOString(),
    cost_usd: costUsd,
    ...details,
  });

  saveUsage(usage, month);

  // 한도 확인
  const limit = roleConfig.monthly_limit;
  const used = usage[roleId].total_usd;
  const pct = (used / limit) * 100;

  const alertThreshold = config.budget_policy.alert_threshold_pct || 80;

  if (pct >= 100) {
    return {
      allowed: false,
      action: roleConfig.on_limit,
      message: `Budget limit reached for ${roleId}: $${used.toFixed(2)} / $${limit}`,
      pct: pct.toFixed(1),
    };
  }

  if (pct >= alertThreshold) {
    return {
      allowed: true,
      warning: true,
      message: `Budget warning for ${roleId}: $${used.toFixed(2)} / $${limit} (${pct.toFixed(1)}%)`,
      pct: pct.toFixed(1),
    };
  }

  return { allowed: true, pct: pct.toFixed(1) };
}

/**
 * 예산 보고서 생성
 */
export function generateBudgetReport(month = getCurrentMonth()) {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const usage = loadUsage(month);

  const report = {
    month,
    generated_at: new Date().toISOString(),
    roles: {},
    total_used: 0,
    total_limit: 0,
  };

  for (const [roleId, roleConfig] of Object.entries(config.budget_policy.roles)) {
    const used = usage[roleId]?.total_usd || 0;
    const limit = roleConfig.monthly_limit;

    report.roles[roleId] = {
      used: used.toFixed(2),
      limit,
      pct: ((used / limit) * 100).toFixed(1),
      calls: usage[roleId]?.calls || 0,
      status: used >= limit ? 'OVER_LIMIT' : used >= limit * 0.8 ? 'WARNING' : 'OK',
    };

    report.total_used += used;
    report.total_limit += limit;
  }

  report.total_used = report.total_used.toFixed(2);
  report.total_pct = ((report.total_used / report.total_limit) * 100).toFixed(1);

  return report;
}
