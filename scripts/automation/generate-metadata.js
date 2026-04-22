#!/usr/bin/env node

/**
 * generate-metadata.js — Gemini로 70_publish_meta.json 자동 생성
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

const SYSTEM_PROMPT = `You are "Metadata Writer Agent" of BarroTube (Korean economy YouTube Shorts channel).

OUTPUT: Single JSON only. No markdown.

SCHEMA:
{
  "title": "100자 이내, primary keyword 앞 30자에, '#Shorts' 포함 권장",
  "summary": "150자 이내 한 줄 요약",
  "description": "첫 100자에 secondary keywords 2~3개, 중간에 long-tail, 말미에 해시태그 블록",
  "tags": ["18~25개, 합산 500자 이내, primary + secondary + related"],
  "categoryId": "25 (News & Politics)",
  "language": "ko",
  "shortsTag": true,
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
- 브랜드 해시태그 포함: #BarroTube, #60초경제
- privacyStatus는 절대 설정하지 마라 (사용자가 별도 지정)

CRITICAL JSON FORMATTING:
- String 값 내부에 줄바꿈이 필요하면 반드시 literal \\n 문자열을 사용 (실제 newline 금지).
- 예시: "description": "첫 줄.\\n\\n다음 줄." (O)
- 절대: "description": "첫 줄.
  다음 줄." (X — JSON invalid)
- 모든 따옴표는 \\" 로 escape.`;

async function callGemini(userPrompt, model = DEFAULT_MODEL) {
  const key = getSecret('GOOGLE_AI_API_KEY');
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 4000,
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
  const scriptPath = join(epDir, '30_script.md');
  if (!existsSync(scriptPath)) { console.error('❌ Missing 30_script.md'); process.exit(1); }

  const scriptMd = readFileSync(scriptPath, 'utf-8');
  const fm = parseFrontmatter(scriptMd);
  if (!fm) { console.error('❌ No frontmatter'); process.exit(1); }

  const brief = existsSync(join(epDir, '00_brief.md')) ? readFileSync(join(epDir, '00_brief.md'), 'utf-8') : '';
  const refs = existsSync(join(epDir, '05_topic_references.md')) ? readFileSync(join(epDir, '05_topic_references.md'), 'utf-8').slice(0, 1500) : '';

  console.log(`📝 Generating metadata for ${fm.episode_id}`);

  const userPrompt = [
    `[EPISODE]`, fm.episode_id, `Channel: ${fm.channel_id}`, '',
    `[BRIEF]`, brief.slice(0, 800), '',
    `[SCRIPT SCENES]`,
    fm.scenes.map(s => `- [${s.role}] ${s.narration}`).join('\n'),
    '',
    `[NEWS REFERENCES]`, refs,
    '',
    `[TASK]`,
    `위 에피소드의 YouTube/TikTok/Reels 배포 메타데이터를 JSON으로 작성하라.`,
  ].join('\n');

  const raw = await callGemini(userPrompt);

  /**
   * Gemini가 간혹 string value 내부에 literal newline을 넣음.
   * JSON.parse 실패 시 한정적 fix-up 시도: string value 안의 raw newline을 \\n으로 변환.
   */
  function safeParse(text) {
    try { return JSON.parse(text); } catch {}
    // string value 내 literal newline/tab escape
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
  meta.privacyStatus = 'private'; // 기본 private, 운영자가 필요 시 변경

  const outPath = join(epDir, '70_publish_meta.json');
  writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`✅ Metadata saved: ${outPath}`);
  console.log(`   Title: ${meta.title}`);
  console.log(`   Tags: ${meta.tags?.length || 0}개`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
