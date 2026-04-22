#!/usr/bin/env node

/**
 * fetch-daily-news.js — 경제 뉴스 RSS 수집기
 *
 * 소스:
 *  - 네이버 증권 주요 뉴스 RSS
 *  - 연합뉴스 경제 RSS
 *  - 한국은행 보도자료 RSS
 *  - 매일경제 뉴스 RSS
 *
 * 출력: workspace/daily-news/YYYY-MM-DD/news.json
 *
 * Usage:
 *   node fetch-daily-news.js [--date 2026-04-18] [--sources naver,yna,bok]
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const SOURCES = {
  naver: {
    name: '네이버 증권',
    url: 'https://finance.naver.com/news/news_list.naver?mode=RANK&view=all',
    type: 'html', // RSS 없어서 HTML 파싱
  },
  yna_economy: {
    name: '연합뉴스 경제',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    type: 'rss',
  },
  yna_market: {
    name: '연합뉴스 증권',
    url: 'https://www.yna.co.kr/rss/market.xml',
    type: 'rss',
  },
  bok: {
    name: '한국은행 보도자료',
    url: 'https://www.bok.or.kr/portal/bbs/P0000559/rss.do?menuNo=200762',
    type: 'rss',
  },
  mk_economy: {
    name: '매일경제',
    url: 'https://www.mk.co.kr/rss/30000001/',
    type: 'rss',
  },
};

/**
 * RSS XML → 항목 배열 (regex 파싱, 외부 의존성 없음)
 */
function parseRss(xml) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [, ''])[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [, ''])[1].trim();
    const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [, ''])[1].trim();
    const desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [, ''])[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (title) items.push({ title, link, pubDate, description: desc });
  }
  return items;
}

async function fetchSource(key, spec) {
  try {
    const res = await fetch(spec.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 BarroTube News Collector',
        'Accept': spec.type === 'rss' ? 'application/rss+xml, application/xml' : 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    let items = [];
    if (spec.type === 'rss') {
      items = parseRss(text);
    } else {
      // HTML 모드는 기본 regex로 제목만 — naver 등 구조별로 확장 가능
      const titleRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let m;
      while ((m = titleRe.exec(text)) !== null && items.length < 20) {
        items.push({ title: m[2].trim(), link: m[1], pubDate: '', description: '' });
      }
    }

    return {
      source: key,
      source_name: spec.name,
      fetched_at: new Date().toISOString(),
      count: items.length,
      items: items.slice(0, 30), // 소스당 최대 30개
    };
  } catch (e) {
    return { source: key, source_name: spec.name, error: e.message, items: [] };
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      date: { type: 'string', short: 'd' },
      sources: { type: 'string', short: 's' },
    },
  });

  const date = values.date || new Date().toISOString().slice(0, 10);
  const sourceKeys = values.sources
    ? values.sources.split(',').map(s => s.trim())
    : Object.keys(SOURCES);

  console.log(`📰 Fetching economic news for ${date}`);
  console.log(`   Sources: ${sourceKeys.join(', ')}`);

  const results = [];
  for (const key of sourceKeys) {
    if (!SOURCES[key]) {
      console.warn(`  ⚠ Unknown source: ${key}`);
      continue;
    }
    process.stdout.write(`  ${key}... `);
    const r = await fetchSource(key, SOURCES[key]);
    results.push(r);
    if (r.error) {
      console.log(`❌ ${r.error}`);
    } else {
      console.log(`✅ ${r.count}개`);
    }
  }

  const outDir = resolve('workspace/daily-news', date);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'news.json');

  const summary = {
    date,
    fetched_at: new Date().toISOString(),
    sources: results,
    total_items: results.reduce((a, r) => a + (r.items?.length || 0), 0),
  };

  writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n✅ Saved: ${outPath}`);
  console.log(`   Total: ${summary.total_items}개 기사`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
