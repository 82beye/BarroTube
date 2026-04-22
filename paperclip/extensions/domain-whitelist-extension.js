/**
 * Paperclip Extension: Domain Whitelist Enforcement
 * PRD §10: 도메인 화이트리스트 강제
 *
 * 모든 외부 fetch 호출을 인터셉트하여 화이트리스트 검증
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(import.meta.dirname, '../config/domain-whitelist.json');

let whitelist = null;

function loadWhitelist() {
  if (whitelist) return whitelist;
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const allDomains = new Set();

  for (const category of Object.values(config.domain_whitelist.allowed_domains)) {
    for (const domain of category) {
      allDomains.add(domain);
    }
  }

  whitelist = {
    allowed: allDomains,
    blocked_patterns: config.domain_whitelist.blocked_patterns || [],
  };

  return whitelist;
}

/**
 * URL이 화이트리스트에 포함되는지 검증
 */
export function isAllowed(urlString) {
  const wl = loadWhitelist();

  let hostname;
  try {
    hostname = new URL(urlString).hostname;
  } catch {
    return false;
  }

  // 차단 패턴 확인
  for (const pattern of wl.blocked_patterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
    );
    if (regex.test(hostname)) {
      return false;
    }
  }

  // 화이트리스트 확인
  return wl.allowed.has(hostname);
}

/**
 * 보안 fetch 래퍼 — 화이트리스트 외부 도메인 거부
 */
export async function secureFetch(url, options = {}) {
  if (!isAllowed(url)) {
    const hostname = new URL(url).hostname;
    throw new Error(
      `[Domain Whitelist] Blocked: ${hostname} is not in the allowed domain list. ` +
      `Add it to paperclip/config/domain-whitelist.json if needed.`
    );
  }

  return fetch(url, options);
}
