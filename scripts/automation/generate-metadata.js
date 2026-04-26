#!/usr/bin/env node

/**
 * generate-metadata.js — Gemini로 70_publish_meta.json 자동 생성 (format 분기 지원)
 *
 * v1.1 (2026-04-22): format=shorts/long-3min 분기. Shorts 하드코딩 제거.
 *
 * Script + QA 결과를 바탕으로 title/description/tags + platforms.{youtube,tiktok,reels} 작성.
 * 작성 후 seo-enhance.js가 3-layer 자동 보강.
 *
 * Usage:
 *   node generate-metadata.js --episode <dir>
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYAML } from 'yaml';
import { getSecret } from './config-loader.js';

const DEFAULT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

function buildSystemPrompt(format, seriesInfo) {
  const isShorts = format === 'shorts';
  const formatLabel = isShorts ? 'YouTube Shorts (60초)' : 'YouTube 롱폼 (3분 시리즈)';
  // 시리즈 표시명: seriesInfo.series_name (series.json에서 동적 로드) 또는 series_id 자체.
  // 이전 코드는 sp500을 hardcode해서 다른 시리즈에도 sp500 라벨이 박혔음 — 이를 동적으로 교체.
  const seriesName = seriesInfo?.series_name || seriesInfo?.series_id || '';
  const titleHint = isShorts
    ? "100자 이내, primary keyword 앞 30자에, '#Shorts' 포함 권장"
    : `70자 이내, primary keyword 앞 30자, 시리즈 번호 포함 예: '[${seriesName} ${seriesInfo?.series_episode || 1}/${seriesInfo?.series_total || 5}]', #Shorts 사용 금지`;
  const shortsTagValue = isShorts ? 'true' : 'false';
  const brandHashtags = isShorts ? '#BarroTube, #60초경제' : '#BarroTube, #3분경제, #경제수업';

  const seriesBlock = seriesInfo
    ? `\nSERIES CONTEXT:\n- Series: ${seriesInfo.series_id} "${seriesName}" (episode ${seriesInfo.series_episode}/${seriesInfo.series_total || '?'})\n- Title MUST include this series badge: "[${seriesName} ${seriesInfo.series_episode}/${seriesInfo.series_total || 5}]" — DO NOT substitute another series name (e.g. previous series).\n- description 상단 2~3줄에 "이 영상은 ${seriesName} 시리즈의 ${seriesInfo.series_episode}번째 편입니다." 시리즈 네비게이션 포함\n- Tags에 시리즈 관련 태그 필수 (${seriesInfo.series_id.replace(/-basic$/, '')}입문, ${seriesName.replace(/\s+입문.*$/, '')}시리즈 등)\n`
    : '';

  return `You are "Metadata Writer Agent" of BarroTube (Korean economy YouTube channel).

FORMAT: ${format} (${formatLabel})
${seriesBlock}
OUTPUT: Single JSON only. No markdown, no code fences.

SCHEMA:
{
  "title": "${titleHint}",
  "summary": "150자 이내 한 줄 요약",
  "description": "${isShorts ? '첫 100자에 secondary keywords, 말미에 해시태그' : '첫 100자에 시리즈 컨텍스트 + primary keyword, 중간에 본편 핵심 3가지, 다음 편 예고, 말미에 해시태그'}",
  "tags": ["18~25개, 합산 500자 이내, primary + secondary + related"],
  "categoryId": "25 (News & Politics)",
  "language": "ko",
  "shortsTag": ${shortsTagValue},
  "madeForKids": false,
  "platforms": {
    "youtube": {"caption": null, "hashtags": null},
    "tiktok": {"caption": "2200자 이내, 훅+3포인트+CTA 구조", "hashtags": ["#...", "..."]},
    "reels": {"caption": "2200자 이내", "hashtags": ["#...", "..."]}
  }
}

RULES:
- 클릭베이트/과장 금지
- 특정 종목 매수 추천 X
- 수치 구어체 (예: "4.4조" 대신 "사조사천억" 혹은 "4.4조 원")
- 브랜드 해시태그 포함: ${brandHashtags}
- privacyStatus는 절대 설정하지 마라 (사용자가 별도 지정)
${isShorts ? '- Description에 "#Shorts" 포함 필수' : '- "#Shorts" 절대 사용 금지 (롱폼은 Shorts 배지 박탈됨)'}
- description 말미에 면책 문구 포함: "본 영상은 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."

CRITICAL JSON FORMATTING:
- String 값 내부에 줄바꿈이 필요하면 반드시 literal \\n 문자열을 사용 (실제 newline 금지).
- 예시: "description": "첫 줄.\\n\\n다음 줄." (O)
- 절대: "description": "첫 줄.
  다음 줄." (X — JSON invalid)
- 모든 따옴표는 \\" 로 escape.`;
}

async function callGemini(systemPrompt, userPrompt, model = DEFAULT_MODEL, maxTokens = 4000) {
  const key = getSecret('GOOGLE_AI_API_KEY');
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  return m ? parseYAML(m[1]) : null;
}

async function main() {
  const { values } = parseArgs({ options: { episode: { type: 'string', short: 'e' } } });
  if (!values.episode) { console.error('Usage: generate-metadata.js --episode <dir>'); process.exit(1); }

  const epDir = resolve(values.episode);
  const scriptCandidates = [
    join(epDir, 'platforms', 'long', '30_script.md'),
    join(epDir, 'platforms', 'shorts', '30_script.md'),
    join(epDir, '30_script.md'),
  ];
  const scriptPath = scriptCandidates.find(p => existsSync(p));
  if (!scriptPath) { console.error('❌ Missing 30_script.md'); process.exit(1); }
  const baseDir = scriptPath.replace(/\/30_script\.md$/, '');

  const scriptMd = readFileSync(scriptPath, 'utf-8');
  const fm = parseFrontmatter(scriptMd);
  if (!fm) { console.error('❌ No frontmatter'); process.exit(1); }

  const format = fm.format || 'shorts';
  // series_name을 paperclip/config/series.json에서 동적으로 로드 → 다른 시리즈에 sp500 라벨 박히는 회귀 방지
  let seriesName = null, thumbnailSpec = null;
  if (fm.series_id) {
    try {
      const cfg = JSON.parse(readFileSync(resolve('paperclip/config/series.json'), 'utf-8'));
      const s = (cfg.series || []).find(x => x.id === fm.series_id);
      seriesName = s?.name || null;
      thumbnailSpec = s?.thumbnail_specs?.find(t => t.episode === fm.series_episode) || null;
    } catch {}
  }
  const seriesInfo = fm.series_id ? {
    series_id: fm.series_id,
    series_name: seriesName,
    series_episode: fm.series_episode,
    series_total: fm.series_total || 5,
  } : null;

  const brief = existsSync(join(epDir, '00_brief.md')) ? readFileSync(join(epDir, '00_brief.md'), 'utf-8') : '';
  const refs = existsSync(join(epDir, '05_topic_references.md')) ? readFileSync(join(epDir, '05_topic_references.md'), 'utf-8').slice(0, 1500) : '';

  console.log(`📝 Generating metadata for ${fm.episode_id}`);
  console.log(`   Format: ${format}`);
  if (seriesInfo) console.log(`   Series: ${seriesInfo.series_id} [${seriesInfo.series_episode}/${seriesInfo.series_total}]`);

  const systemPrompt = buildSystemPrompt(format, seriesInfo);

  const userPrompt = [
    `[EPISODE]`, fm.episode_id, `Channel: ${fm.channel_id}`, `Format: ${format}`,
    seriesInfo ? `Series: ${seriesInfo.series_id} ep ${seriesInfo.series_episode}/${seriesInfo.series_total}` : '',
    '',
    `[BRIEF]`, brief.slice(0, 800), '',
    `[SCRIPT SCENES]`,
    fm.scenes.map(s => `- [${s.role}] ${s.narration}`).join('\n'),
    '',
    refs ? `[NEWS REFERENCES]\n${refs}\n` : '',
    `[TASK]`,
    `위 에피소드의 YouTube${format === 'shorts' ? '/TikTok/Reels' : ''} 배포 메타데이터를 JSON으로 작성하라.`,
  ].filter(Boolean).join('\n');

  // Long-form needs more tokens (description is longer + series context)
  const maxTokens = format === 'long-3min' ? 8000 : 4000;
  const raw = await callGemini(systemPrompt, userPrompt, DEFAULT_MODEL, maxTokens);

  function safeParse(text) {
    try { return JSON.parse(text); } catch {}
    const fixed = text.replace(/"((?:[^"\\]|\\.)*)"/gs, (m, inner) => {
      const esc = inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      return `"${esc}"`;
    });
    try { return JSON.parse(fixed); } catch (e) {
      console.error('❌ JSON parse failed (after fix-up):', e.message);
      console.error(text.slice(0, 500));
      process.exit(1);
    }
  }

  const meta = safeParse(raw);

  // 필수 필드 주입/보정
  meta.episode_id = fm.episode_id;
  meta.channel_id = fm.channel_id;
  meta.format = format;
  if (seriesInfo) {
    meta.series_id = seriesInfo.series_id;
    meta.series_episode = seriesInfo.series_episode;
    meta.series_name = seriesInfo.series_name;
    // playlist 자동 등록을 위한 hint
    meta.playlist = {
      series_id: seriesInfo.series_id,
      series_episode: seriesInfo.series_episode,
      register_after_publish: true,
    };
  }
  // 시리즈 thumbnail_specs를 메타에 박아서 publisher가 47_thumbnail.png + 키워드를 매칭할 수 있게.
  // generate-thumbnail이 이미 적용했지만 메타 차원에서도 보존 (audit · 재생성 시 참고).
  if (thumbnailSpec) {
    meta.thumbnail_spec = {
      keyword: thumbnailSpec.keyword,
      palette: thumbnailSpec.palette,
      rationale: thumbnailSpec.rationale,
    };
  }
  meta.thumbnail = meta.thumbnail || '47_thumbnail.png';
  meta.privacyStatus = 'private'; // 기본 private, 운영자가 필요 시 변경

  // Enforce format-aligned shortsTag (Gemini sometimes ignores)
  if (format === 'long-3min') meta.shortsTag = false;

  // 다른 시리즈 라벨이 잘못 들어갔을 경우 title 보정 (Gemini가 종종 환각으로 sp500 prefix를 박음)
  if (seriesInfo && meta.title) {
    const expectedBadge = `[${seriesInfo.series_name} ${seriesInfo.series_episode}/${seriesInfo.series_total}]`;
    const wrongPattern = /\[[^\]]*입문\s+\d+\/\d+\]/;
    const m = meta.title.match(wrongPattern);
    if (m && !meta.title.startsWith(expectedBadge)) {
      const corrected = meta.title.replace(wrongPattern, expectedBadge);
      console.warn(`   ⚠ Title series badge 보정: ${m[0]} → ${expectedBadge}`);
      meta.title = corrected;
    }
  }

  const outPath = join(baseDir, '70_publish_meta.json');
  writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`✅ Metadata saved: ${outPath}`);
  console.log(`   Title: ${meta.title}`);
  console.log(`   shortsTag: ${meta.shortsTag}`);
  console.log(`   Tags: ${meta.tags?.length || 0}개`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
