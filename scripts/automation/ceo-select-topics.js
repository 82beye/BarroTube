#!/usr/bin/env node

/**
 * ceo-select-topics.js — CEO 에이전트 역할, 일일 경제 뉴스에서 Shorts 주제 2개 선정
 *
 * 점수화 기준:
 *  1. 숫자/통계 포함 (+3 per 숫자) → Shorts 훅 강도
 *  2. 채널 lexicon 매칭 (+2 per 키워드) → 채널 정합성
 *  3. 제목 길이 (15~40자 sweet spot, +1)
 *  4. 최근성 (24시간 내 +3, 48시간 내 +1)
 *  5. 중복 제거 (같은 토픽 최다 1개)
 *  6. 악재·단순 사실보도 패널티 (-1)
 *
 * 입력: workspace/daily-news/YYYY-MM-DD/news.json
 * 출력: workspace/daily-news/YYYY-MM-DD/topics.json
 *
 * Usage:
 *   node ceo-select-topics.js [--date 2026-04-18] [--count 2] [--channel econ-daily]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const CHANNEL_KEYWORDS = {
  'econ-daily': [
    '코스피', 'KOSPI', '주가', '증시', '주식',
    'AI', '반도체', 'HBM', '2차전지', '배터리', '바이오',
    '금리', '기준금리', '원화', '환율', '달러',
    '삼성전자', 'SK하이닉스', 'LG에너지솔루션', '현대차',
    '부동산', '집값', '아파트', '전세',
    'GDP', '성장률', '수출', '무역', '경기',
    'Fed', '연준', 'ECB', '한국은행', 'IMF',
    '엔비디아', '테슬라', '애플',
  ],
};

const NEG_PATTERNS = [
  /사망|사고|범죄|화재|구속|기소/,
  /광고|협찬|이벤트|프로모션/,
];

function scoreItem(item, keywords) {
  let score = 0;
  const text = `${item.title} ${item.description || ''}`;

  // 1. 숫자 포함 (퍼센트, 조원, 달러 등)
  const numbers = text.match(/\d+(\.\d+)?(\s*(%|퍼센트|조|억|천만|만|달러|원|bp|포인트))?/g) || [];
  score += Math.min(numbers.length, 5) * 3;

  // 2. 채널 키워드 매칭
  const matched = keywords.filter(k => text.includes(k));
  score += matched.length * 2;

  // 3. 제목 길이
  const tLen = item.title.length;
  if (tLen >= 15 && tLen <= 40) score += 2;
  else if (tLen > 40 && tLen <= 60) score += 1;

  // 4. 최근성
  if (item.pubDate) {
    const pub = new Date(item.pubDate);
    const hoursAgo = (Date.now() - pub.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) score += 3;
    else if (hoursAgo < 48) score += 1;
    else if (hoursAgo > 72) score -= 2;
  }

  // 5. 부정 패턴 패널티
  for (const pat of NEG_PATTERNS) {
    if (pat.test(text)) score -= 4;
  }

  // 6. 질문형 / 분석형 제목 +1 (Shorts 친화)
  if (/[?왜어떻게얼마나]/.test(item.title)) score += 1;
  if (/전망|분석|시나리오|포인트|핵심|이유|원인|배경/.test(item.title)) score += 1;

  return { score, matched, numbers: numbers.length };
}

function dedup(items) {
  // 제목 첫 15자 기준 중복 제거 (같은 기사 여러 매체 노출)
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.title.slice(0, 15).replace(/\s/g, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function extractTopicKeyword(title, keywords) {
  // 제목에서 가장 먼저 등장하는 채널 키워드 추출 + 문맥
  const text = title;
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      // 해당 키워드 + 인접 수치/명사
      const nums = text.match(/\d+(\.\d+)?(\s*(%|퍼센트|조|억|만|달러))?/);
      return nums ? `${kw} ${nums[0]}` : kw;
    }
  }
  return title.split(/[\s,]/)[0];
}

async function main() {
  const { values } = parseArgs({
    options: {
      date: { type: 'string', short: 'd' },
      count: { type: 'string', short: 'n' },
      channel: { type: 'string', short: 'c' },
    },
  });

  const date = values.date || new Date().toISOString().slice(0, 10);
  const count = parseInt(values.count || '2');
  const channel = values.channel || 'econ-daily';
  const keywords = CHANNEL_KEYWORDS[channel] || CHANNEL_KEYWORDS['econ-daily'];

  const newsPath = resolve('workspace/daily-news', date, 'news.json');
  if (!existsSync(newsPath)) {
    console.error(`❌ News not found: ${newsPath}\n   Run: node scripts/automation/fetch-daily-news.js --date ${date}`);
    process.exit(1);
  }

  const news = JSON.parse(readFileSync(newsPath, 'utf-8'));

  // 모든 소스에서 items flatten
  const all = news.sources.flatMap(s => (s.items || []).map(it => ({ ...it, source: s.source_name })));
  console.log(`📥 Loaded ${all.length} items from ${news.sources.length} sources`);

  // 점수화
  const scored = all
    .map(it => ({ ...it, ...scoreItem(it, keywords) }))
    .filter(it => it.score > 0);

  // 중복 제거
  const unique = dedup(scored);
  unique.sort((a, b) => b.score - a.score);

  console.log(`\n🏆 Top 10 candidates:`);
  unique.slice(0, 10).forEach((it, i) => {
    console.log(`  ${i + 1}. [${it.score}점] ${it.title.slice(0, 60)} (${it.matched.join(',') || '-'})`);
  });

  const selected = unique.slice(0, count).map(it => ({
    title: it.title,
    topic: extractTopicKeyword(it.title, keywords),
    source: it.source,
    link: it.link,
    pubDate: it.pubDate,
    score: it.score,
    matched_keywords: it.matched,
    summary: it.description?.slice(0, 200) || '',
  }));

  const outPath = join(resolve('workspace/daily-news', date), 'topics.json');
  writeFileSync(outPath, JSON.stringify({
    date,
    channel_id: channel,
    selected_at: new Date().toISOString(),
    selected_count: selected.length,
    topics: selected,
  }, null, 2), 'utf-8');

  console.log(`\n✅ Selected ${selected.length} topics → ${outPath}`);
  selected.forEach((t, i) => {
    console.log(`  📌 ${i + 1}. ${t.topic} ← "${t.title.slice(0, 50)}..."`);
  });
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
