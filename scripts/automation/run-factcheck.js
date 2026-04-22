#!/usr/bin/env node

/**
 * run-factcheck.js — S5 Factcheck Gate (Phase A — Gemini + google_search grounding)
 *
 * 설계: docs/design/S5-factcheck-gate.md
 * Agent spec: claude-code/.claude/agents/06-fact-checker.md
 *
 * 입력:  <epDir>/30_script.md (Writer 산출물)
 * 출력:  <epDir>/35_factcheck.md (frontmatter + HIGH/MED/LOW 분류 claims)
 * stdout(JSON): { pass, total_claims, high_risk_count, med_risk_count, low_risk_count, file }
 *
 * 호출자:
 *   node run-factcheck.js --episode EP-2026-0009
 *   node run-factcheck.js --episode EP-2026-0009 --force     # 기존 리포트 덮어쓰기
 *   node run-factcheck.js --episode EP-2026-0009 --model gemini-2.5-pro
 *
 * 판정 규칙 (agent spec §Behavior):
 *   - HIGH 가 1개라도 있으면 pass=false
 *   - 검증 불가 주장은 HIGH 로 분류 (안전 우선)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYAML } from 'yaml';
import { getSecret } from './config-loader.js';

const DEFAULT_MODEL = process.env.GEMINI_FACTCHECK_MODEL || 'gemini-2.5-pro';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `You are "Fact Checker Agent" of BarroTube, a Korean economy YouTube Shorts channel.

MISSION:
Extract verifiable claims (numbers, years, proper nouns, quotes, statistics) from the provided script and verify each against reliable sources using google_search. Classify risk and suggest revisions.

RULES:
1. Output MUST be a single JSON object. No markdown, no prose, no code fences.
2. Extract every factual claim from every scene. Do not skip any numeric/statistical assertion.
3. For each claim, use google_search to verify against reliable sources (통계청, 한국은행, IMF, World Bank, 연합뉴스, 로이터, AP, BBC, 공식 기업 공시 등).
4. Classify risk:
   - HIGH: 수치 오류, 날짜 오류, 인물/기업 혼동, 법적/규제 위험, 검증 불가 (안전 우선 — unverifiable = HIGH)
   - MED: 맥락 누락, 과장 표현, 불완전한 인용
   - LOW: 사소한 표현 차이, 최신 데이터와 미세 차이
5. For HIGH/MED, always provide "suggested_revision" (corrected Korean sentence, same 스타일/길이).
6. Cite "evidence" with source URL or official document name. Min 2 independent sources for HIGH.
7. If a claim cannot be verified via search, mark HIGH with risk_reason="unverifiable".

OUTPUT SCHEMA:
{
  "summary": "1-sentence Korean summary of overall factual integrity",
  "claims": [
    {
      "scene_id": "001",
      "claim": "원문 그대로 인용",
      "verdict": "사실|부정확|미확인|오류",
      "risk": "HIGH|MED|LOW",
      "evidence": "출처 URL or 문서명 (핵심 1~2줄 발췌)",
      "suggested_revision": "수정된 한국어 문장 (HIGH/MED 만, LOW 는 빈 문자열)",
      "risk_reason": "왜 이 위험도인지 1문장"
    }
  ]
}`;

function readIfExists(p) { return existsSync(p) ? readFileSync(p, 'utf-8') : ''; }

function parseScriptFrontmatter(scriptText) {
  const m = scriptText.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('30_script.md has no YAML frontmatter');
  return parseYAML(m[1]);
}

async function callGeminiWithSearch(userPrompt, model) {
  const key = getSecret('GOOGLE_AI_API_KEY');
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const url = `${API_BASE}/models/${model}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n');
  if (!text) throw new Error(`No content: ${JSON.stringify(data).slice(0, 300)}`);

  const groundingMeta = data.candidates?.[0]?.groundingMetadata || null;
  const webSearchQueries = groundingMeta?.webSearchQueries || groundingMeta?.web_search_queries || [];
  return { text, groundingMeta, webSearchQueries, usage: data.usageMetadata || null };
}

function extractJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fence ? fence[1] : text).trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`Unable to locate JSON object in model output:\n${text.slice(0, 500)}`);
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

function classify(claims) {
  const counts = { HIGH: 0, MED: 0, LOW: 0 };
  for (const c of claims) {
    const k = (c.risk || '').toUpperCase();
    if (k in counts) counts[k]++;
  }
  return counts;
}

function formatMarkdown({ episodeId, channelId, scriptRevision, checkedAt, result, groundingSources, webSearchQueries }) {
  const counts = classify(result.claims || []);
  const pass = counts.HIGH === 0;
  const total = (result.claims || []).length;
  const grounded = groundingSources.length > 0;

  const fm = [
    '---',
    `episode_id: ${episodeId}`,
    `channel_id: ${channelId}`,
    `script_revision: ${scriptRevision}`,
    `checked_at: ${checkedAt}`,
    `total_claims: ${total}`,
    `high_risk_count: ${counts.HIGH}`,
    `med_risk_count: ${counts.MED}`,
    `low_risk_count: ${counts.LOW}`,
    `pass: ${pass}`,
    `backend: gemini-google_search`,
    `grounded: ${grounded}`,
    `grounding_source_count: ${groundingSources.length}`,
    `search_query_count: ${webSearchQueries?.length || 0}`,
    '---',
    '',
  ].join('\n');

  const groupsOrder = ['HIGH', 'MED', 'LOW'];
  const groups = { HIGH: [], MED: [], LOW: [] };
  for (const c of result.claims || []) {
    const key = (c.risk || '').toUpperCase();
    if (groups[key]) groups[key].push(c);
  }

  const sections = ['# Fact Check Report', ''];
  sections.push('## Summary');
  sections.push(`- 총 검증 항목: ${total}개`);
  sections.push(`- HIGH: ${counts.HIGH} | MED: ${counts.MED} | LOW: ${counts.LOW}`);
  sections.push(`- **판정**: ${pass ? 'PASS' : 'FAIL'}`);
  if (result.summary) sections.push(`- 요약: ${result.summary}`);
  sections.push('');

  sections.push('## Detailed Findings');
  sections.push('');

  for (const g of groupsOrder) {
    for (const c of groups[g]) {
      sections.push(`### [${g}] Scene ${c.scene_id || '?'}: "${(c.claim || '').slice(0, 120)}"`);
      sections.push(`- **주장**: ${c.claim || ''}`);
      sections.push(`- **검증 결과**: ${c.verdict || '미기재'}`);
      sections.push(`- **근거**: ${c.evidence || '미기재'}`);
      if (g !== 'LOW' && c.suggested_revision) {
        sections.push(`- **수정 제안**: "${c.suggested_revision}"`);
      }
      if (c.risk_reason) sections.push(`- **위험 사유**: ${c.risk_reason}`);
      sections.push('');
    }
  }

  if (!grounded) {
    sections.push('> ⚠ **Grounding 미활성**: Gemini 가 google_search tool 을 호출하지 않고 내부 지식만으로 응답했습니다. evidence 필드의 인용은 모델의 학습 데이터 기반이며 실시간 검증이 아닙니다. HIGH 위험 결정 전 수동 재확인 권장.');
    sections.push('');
  }

  if (webSearchQueries && webSearchQueries.length > 0) {
    sections.push('## Search Queries Used');
    for (const q of webSearchQueries) sections.push(`- \`${q}\``);
    sections.push('');
  }

  if (groundingSources && groundingSources.length > 0) {
    sections.push('## Grounding Sources (Google Search)');
    for (const s of groundingSources) {
      sections.push(`- ${s}`);
    }
    sections.push('');
  }

  return fm + sections.join('\n');
}

function collectGroundingSources(meta) {
  if (!meta) return [];
  const chunks = meta.groundingChunks || meta.grounding_chunks || [];
  const sources = [];
  for (const ch of chunks) {
    const web = ch.web || ch.Web;
    if (web?.uri) sources.push(`${web.title || ''} — ${web.uri}`.trim());
  }
  return Array.from(new Set(sources)).slice(0, 20);
}

async function main() {
  const { values } = parseArgs({
    options: {
      episode: { type: 'string', short: 'e' },
      force: { type: 'boolean', default: false },
      model: { type: 'string', short: 'm' },
    },
  });
  if (!values.episode) {
    console.error('Usage: run-factcheck.js --episode <EP-YYYY-NNNN> [--force] [--model gemini-2.5-pro]');
    process.exit(1);
  }

  let epDir = values.episode;
  if (!epDir.startsWith('/') && !epDir.startsWith('workspace/')) {
    epDir = join('workspace/episodes', values.episode);
  }
  const absEp = resolve(epDir);

  const scriptPath = join(absEp, '30_script.md');
  const outPath = join(absEp, '35_factcheck.md');

  if (!existsSync(scriptPath)) {
    console.error(`❌ ${scriptPath} 없음 — S4 Script 먼저 실행`);
    process.exit(1);
  }

  if (existsSync(outPath) && !values.force) {
    const existing = readIfExists(outPath);
    const passMatch = existing.match(/^pass:\s*(true|false)/m);
    const highMatch = existing.match(/^high_risk_count:\s*(\d+)/m);
    const totalMatch = existing.match(/^total_claims:\s*(\d+)/m);
    if (passMatch) {
      const result = {
        pass: passMatch[1] === 'true',
        total_claims: totalMatch ? parseInt(totalMatch[1], 10) : 0,
        high_risk_count: highMatch ? parseInt(highMatch[1], 10) : 0,
        med_risk_count: 0,
        low_risk_count: 0,
        file: outPath,
        cached: true,
      };
      console.log(JSON.stringify(result));
      process.exit(0);
    }
  }

  const scriptText = readFileSync(scriptPath, 'utf-8');
  const fm = parseScriptFrontmatter(scriptText);
  const episodeId = fm.episode_id || 'EP-UNKNOWN';
  const channelId = fm.channel_id || 'econ-daily';
  const scriptRevision = fm.revision ?? 1;

  const userPrompt = [
    '[EPISODE SCRIPT TO FACT-CHECK]',
    scriptText,
    '',
    '---',
    'Extract every verifiable claim from every scene narration. Verify each using google_search against reliable sources.',
    'Return the JSON object per the OUTPUT SCHEMA. Do not include the script itself in the output.',
  ].join('\n');

  console.error(`🔍 Factcheck: ${episodeId} (model=${values.model || DEFAULT_MODEL})`);

  const { text, groundingMeta, webSearchQueries, usage } = await callGeminiWithSearch(userPrompt, values.model || DEFAULT_MODEL);

  let result;
  try { result = extractJSON(text); }
  catch (e) {
    console.error(`❌ JSON parse failed: ${e.message}`);
    console.error('--- raw output ---');
    console.error(text.slice(0, 1000));
    process.exit(2);
  }

  if (!Array.isArray(result.claims)) {
    console.error(`❌ result.claims is not an array`);
    process.exit(2);
  }

  const counts = classify(result.claims);
  const groundingSources = collectGroundingSources(groundingMeta);

  const md = formatMarkdown({
    episodeId,
    channelId,
    scriptRevision,
    checkedAt: new Date().toISOString(),
    result,
    groundingSources,
    webSearchQueries,
  });
  writeFileSync(outPath, md, 'utf-8');

  if (groundingSources.length === 0) {
    console.error(`⚠  grounding 비활성 — Gemini 가 google_search 를 호출하지 않음. evidence 는 모델 지식 기반, 실시간 검색 아님.`);
  }

  const summary = {
    pass: counts.HIGH === 0,
    total_claims: result.claims.length,
    high_risk_count: counts.HIGH,
    med_risk_count: counts.MED,
    low_risk_count: counts.LOW,
    file: outPath,
    grounding_sources: groundingSources.length,
    usage: usage ? { prompt: usage.promptTokenCount, completion: usage.candidatesTokenCount } : null,
  };
  console.log(JSON.stringify(summary));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}

export { parseScriptFrontmatter, classify, formatMarkdown, extractJSON };
