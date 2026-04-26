#!/usr/bin/env node

/**
 * generate-script.js — Gemini로 스크립트 자동 생성 (format 분기 지원)
 *
 * v1.1 (2026-04-22): format=shorts(5씬·60s) / format=long-3min(7씬·180s) 듀얼 라인 지원
 *   - brief의 `format` 필드로 분기
 *   - long-3min는 series_id/series_episode 있으면 시리즈 컨텍스트 자동 로드
 *   - style-guide-{format}.md + persona/{persona}.md 함께 컨텍스트에 주입
 *
 * 입력:
 *   - 00_brief.md (topic, channel_id, format, persona, series_id?, series_episode?)
 *   - 05_topic_references.md (선택)
 *   - workspace/channels/{channel}/style-guide-{format}.md
 *   - workspace/channels/{channel}/persona/{persona}.md (있으면)
 *   - workspace/channels/{channel}/series/{series_id}/curriculum.md (long 시리즈)
 *   - workspace/channels/{channel}/series/{series_id}/ep-{N-1}-brief.md (이전 편 리캡)
 *
 * 출력:
 *   - 30_script.md (YAML frontmatter + N씬 narration/image_prompt/bgm_mood/emphasis_tokens)
 *
 * Usage:
 *   node generate-script.js --episode <dir>
 *   node generate-script.js --episode <dir> --model gemini-2.5-flash
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { getSecret } from './config-loader.js';

const DEFAULT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const FORMAT_SPECS = {
  'shorts': {
    scene_count: 5,
    target_total_seconds: 60,
    scene_chars_range: '60~90 Korean chars (8~13s TTS)',
    aspect: 'vertical 9:16',
    scene_roles: '001=hook, 002=context, 003=insight, 004=implication, 005=cta',
    mid_hook: false,
    style_guide_filename: 'style-guide-shorts.md',
    voice_tone_note: '긴장·경고 톤 허용 (사실 기반 내에서). "놓치면 손해" 류 Hook OK.',
  },
  'long-3min': {
    scene_count: 7,
    target_total_seconds: 180,
    scene_chars_range: '120~180 Korean chars per scene (scene별 10~40s, 전체 900~1100자)',
    aspect: 'horizontal 16:9',
    scene_roles: '001=hook(15s), 002=intro/recap(15s), 003=definition(35s), 004=data(40s·mid_hook at 75s), 005=insight(35s), 006=implication(30s), 007=wrap+teaser+disclaimer(10s)',
    mid_hook: true,
    style_guide_filename: 'style-guide-long.md',
    voice_tone_note: '친근·신뢰 톤. 공포·경고 금지. 음성 면책 5초 씬 7 필수 ("본 영상은 투자 조언이 아닙니다...").',
  },
};

function buildSystemPrompt(format, persona, seriesContext) {
  const spec = FORMAT_SPECS[format];
  const sceneCount = spec.scene_count;

  const seriesBlock = seriesContext
    ? `\nSERIES CONTEXT:\n- Series: ${seriesContext.series_id} (episode ${seriesContext.series_episode}/${seriesContext.series_total})\n- This episode theme_axis: ${seriesContext.theme_axis}\n- Intro card template: "📚 Barro 경제수업 · ${seriesContext.series_name} [${seriesContext.series_episode}/${seriesContext.series_total}]"\n- Required: 씬 2에 이전 편 리캡 포함 (EP02~). 씬 7에 다음 편 티저 (시리즈 마지막은 다음 시리즈 예고).\n`
    : '';

  const personaBlock = persona
    ? `\nPERSONA: ${persona}\n- 톤 가이드: ${spec.voice_tone_note}\n- persona 상세 규칙은 [PERSONA GUIDE] 블록 참조.\n`
    : '';

  return `You are "Writer Agent" of BarroTube, a Korean economy YouTube channel.

FORMAT: ${format}
- Scene count: EXACTLY ${sceneCount} scenes
- Target total duration: ~${spec.target_total_seconds} seconds
- Narration length: ${spec.scene_chars_range}
- Aspect: ${spec.aspect}
- Scene roles (mandatory): ${spec.scene_roles}
${spec.mid_hook ? '- MID-HOOK REQUIRED: 씬 4 마지막 부분 또는 75초 지점에 "재점화 Hook" (이탈 방지 질문/궁금증 유발 1문장) 포함\n' : ''}${seriesBlock}${personaBlock}
RULES:
1. Output MUST be a single JSON object. No markdown, no prose, no code fences.
2. Voice is Yohan Koo (ElevenLabs Korean male) at ~6-7 Korean chars/sec.
3. Image prompts in ENGLISH. Pattern MUST match proven format: "${spec.aspect}, cartoon stick figure [action verb-ing], [1-2 simple symbolic props], bold line art". Keep to 1 short sentence (≤25 words). FORBIDDEN words in image_prompt: "friendly", "smiling", "confident", "happy", "excited", "attentive", "suit", "tie", "shirt", "hair", "teacher", "businessman" — these bias the model toward detailed characters. Use ACTION VERBS only: "pointing at", "holding", "standing beside", "balancing", "running toward", "watching", "confused between", "raising". Example GOOD: "horizontal 16:9, cartoon stick figure pointing at pie chart with one large orange wedge, small stack of coins below, bold line art". Example BAD: "a friendly stick figure teacher with confident smile holding a pie chart".
4. Korean numbers as Korean words (예: "사십 퍼센트" not "40%").
5. BGM moods: tense_intro, calm_explain, dramatic_reveal, hopeful_outro, neutral_bg, upbeat_energy.
6. emphasis_tokens: 1~3 Korean keywords per scene.
7. Target audience: 20~40대 한국 투자자.
8. FORBIDDEN: specific stock buy/sell recommendations, "무조건/100%/확실/이것만 하면 부자", 정치 편향.
9. CRITICAL — narration is FOR TTS ONLY. DO NOT include in narration: emojis (📚 🚨 etc), bracket tags ([1/5]), intro card text, subtitle overlays, or any text that appears as visual-only elements. Those belong to video/subtitle layers — not to spoken audio.
10. CRITICAL — Hook scene (씬 001) MUST include the SINGLE most impactful numeric value from the brief (percentage, count, date, dollar amount). Generic hooks without a specific number fail impact check.
11. CRITICAL — image_prompt MUST NOT contain any text/words/numbers/company-names/labels to be rendered as text in the image. The image model will literally draw any text you mention. Use visual metaphors only:
    - BAD:  "pie chart labeled '80% of market cap' with company names 'Apple, Microsoft, Amazon'"
    - GOOD: "pie chart with one large highlighted wedge, three small anonymous company building icons stacked beside it"
    - BAD:  "stick figure holding sign that says 'WARNING'"
    - GOOD: "stick figure with surprised expression, large exclamation mark floating overhead"
    Use symbolic shapes (arrow up/down for change, stacks of coins for money, chart with wedge for percentage, generic building icon for company) — NEVER text labels.
12. CRITICAL — narration length MUST match target_seconds at ~6.0 Korean chars/sec (TTS speaking rate). For a scene with target_seconds=30, narration MUST be 170~190 Korean chars. Too short leaves silence; too long gets cut off. Compute per scene:
    - target 10s → 55~65자
    - target 15s → 85~95자
    - target 30s → 170~190자
    - target 35s → 200~215자
    - target 40s → 230~245자
    Count Korean characters only (exclude punctuation from the hard limit; you may go ±5 chars for natural flow).
13. CRITICAL — For the FINAL wrap scene with disclaimer (format=long-3min), target_seconds MUST be AT LEAST 20s because the mandatory disclaimer ("본 영상은 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.") alone is ~50 Korean chars (~8s TTS). Redistribute 5~10s from middle scenes (3~6) to the wrap scene when the total would otherwise exceed ${spec.target_total_seconds}s. The sum of all target_seconds MUST still equal ${spec.target_total_seconds}s exactly.
${format === 'long-3min' ? '9. REQUIRED: 씬 7 마지막에 음성 면책 멘트 포함 ("본 영상은 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.").\n' : '9. 자막 면책 "투자조언 아님"은 후처리로 자막 레이어에 추가됨 (narration에 넣지 말 것).\n'}
OUTPUT SCHEMA:
{
  "scenes": [
    {
      "scene_id": "001",
      "role": "hook",
      "narration": "...",
      "image_prompt": "${spec.aspect}, cartoon stick figure...",
      "bgm_mood": "tense_intro",
      "target_seconds": 15,
      "emphasis_tokens": ["...", "..."]
    }
    // ... ${sceneCount} total
  ],
  "angle_summary": "Short (한국어, 1 문장) summary of the episode angle chosen."
}`;
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

function parseBriefFrontmatter(brief) {
  const match = brief.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try { return parseYAML(match[1]) || {}; } catch { return {}; }
}

function loadSeriesContext(channel, fm) {
  if (!fm.series_id) return null;
  const seriesDir = resolve('workspace/channels', channel, 'series', fm.series_id);
  const curriculumPath = join(seriesDir, 'curriculum.md');
  if (!existsSync(curriculumPath)) return null;

  const curriculum = readFileSync(curriculumPath, 'utf-8');
  const cFM = parseBriefFrontmatter(curriculum);

  const ctx = {
    series_id: fm.series_id,
    series_episode: fm.series_episode,
    series_total: cFM.total_episodes || fm.series_total,
    series_name: cFM.series_name || fm.series_id,
    theme_axis: fm.theme_axis,
    curriculum_text: curriculum,
  };

  // 이전 편 brief (리캡용)
  if (fm.series_episode && fm.series_episode > 1) {
    const prevN = String(fm.series_episode - 1).padStart(2, '0');
    const prevPath = join(seriesDir, `ep-${prevN}-brief.md`);
    if (existsSync(prevPath)) ctx.previous_brief_text = readFileSync(prevPath, 'utf-8');
  }

  return ctx;
}

async function callGemini(systemPrompt, userPrompt, model = DEFAULT_MODEL, maxOutputTokens = 5000) {
  const key = getSecret('GOOGLE_AI_API_KEY');
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');
  const url = `${API_BASE}/models/${model}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`No content: ${JSON.stringify(data).slice(0, 300)}`);
  return text;
}

async function main() {
  const { values } = parseArgs({
    options: {
      episode: { type: 'string', short: 'e' },
      model: { type: 'string', short: 'm' },
    },
  });
  if (!values.episode) {
    console.error('Usage: generate-script.js --episode <dir> [--model gemini-2.5-flash]');
    process.exit(1);
  }

  const epDir = resolve(values.episode);
  const brief = readIfExists(join(epDir, '00_brief.md'));
  const refs = readIfExists(join(epDir, '05_topic_references.md'));

  if (!brief) {
    console.error(`❌ Missing 00_brief.md in ${epDir}`);
    process.exit(1);
  }

  const fm = parseBriefFrontmatter(brief);
  const channel = fm.channel_id || 'econ-daily';
  const episodeId = fm.episode_id || 'EP-UNKNOWN';
  const topic = fm.topic || '';

  // format 분기 — brief.format 우선, 미지정 시 'shorts' fallback (backward compat)
  const format = fm.format || 'shorts';
  if (!FORMAT_SPECS[format]) {
    console.error(`❌ Unknown format: ${format}. Supported: ${Object.keys(FORMAT_SPECS).join(', ')}`);
    process.exit(1);
  }
  const spec = FORMAT_SPECS[format];

  const persona = fm.persona || (format === 'long-3min' ? 'barro-teacher' : 'barro-alert');

  // Style guide 분기
  const styleGuidePath = resolve('workspace/channels', channel, spec.style_guide_filename);
  let styleGuide = readIfExists(styleGuidePath);
  if (!styleGuide) {
    // fallback: 옛 style-guide.md (호환성)
    styleGuide = readIfExists(resolve('workspace/channels', channel, 'style-guide.md'));
    if (styleGuide) {
      console.warn(`⚠️  Falling back to style-guide.md (recommend: create ${spec.style_guide_filename})`);
    }
  }

  // Persona guide
  const personaGuide = readIfExists(resolve('workspace/channels', channel, 'persona', `${persona}.md`));

  // Brand (공통)
  const brand = readIfExists(resolve('workspace/channels', channel, 'brand.md'));

  // Series 컨텍스트 (long-3min 시리즈만)
  const seriesContext = format === 'long-3min' ? loadSeriesContext(channel, fm) : null;

  console.log(`🎬 Generating script for ${episodeId}`);
  console.log(`   Format: ${format} (${spec.scene_count} scenes, ${spec.target_total_seconds}s)`);
  console.log(`   Persona: ${persona}`);
  console.log(`   Channel: ${channel}`);
  console.log(`   Topic: ${topic}`);
  if (seriesContext) {
    console.log(`   Series: ${seriesContext.series_id} [${seriesContext.series_episode}/${seriesContext.series_total}] theme=${seriesContext.theme_axis}`);
  }
  console.log(`   Model: ${values.model || DEFAULT_MODEL}`);

  const systemPrompt = buildSystemPrompt(format, persona, seriesContext);

  const userPromptParts = [
    `[EPISODE BRIEF]`,
    brief,
    '',
  ];
  if (refs) userPromptParts.push(`[NEWS REFERENCES]`, refs, '');
  if (brand) userPromptParts.push(`[CHANNEL BRAND]`, brand, '');
  if (styleGuide) userPromptParts.push(`[STYLE GUIDE: ${spec.style_guide_filename}]`, styleGuide, '');
  if (personaGuide) userPromptParts.push(`[PERSONA GUIDE: ${persona}]`, personaGuide, '');
  if (seriesContext?.curriculum_text) userPromptParts.push(`[SERIES CURRICULUM]`, seriesContext.curriculum_text, '');
  if (seriesContext?.previous_brief_text) userPromptParts.push(`[PREVIOUS EPISODE BRIEF (for recap)]`, seriesContext.previous_brief_text, '');

  userPromptParts.push(
    `[TASK]`,
    `위 브리프·뉴스·채널 가이드·페르소나 규칙을 바탕으로 ${spec.scene_count}씬 ${spec.target_total_seconds}초 ${format} 스크립트를 JSON으로 작성하라.`,
    format === 'long-3min'
      ? `- 시리즈 컨텍스트 준수: 씬 2에 이전 편 리캡 (EP01 제외), 씬 7에 다음 편 티저 + 음성 면책.`
      : `- 뉴스 레퍼런스 중 가장 관련성 높은 것을 훅(hook)으로 활용하되, 운영자 의도(주제)가 우선.`,
    `- 페르소나 금기 표현 준수. 페르소나 위반은 품질 저하로 판정됨.`,
    `- 팩트 기반, 수치는 구어체.`,
    `- 특정 종목 매수 추천 X.`,
  );

  const userPrompt = userPromptParts.join('\n');
  // Long-form is ~3x content of shorts — needs much larger token budget
  const maxTokens = format === 'long-3min' ? 12000 : 5000;
  const rawJson = await callGemini(systemPrompt, userPrompt, values.model, maxTokens);

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    console.error('❌ JSON 파싱 실패');
    console.error(rawJson.slice(0, 500));
    process.exit(1);
  }

  const scenes = parsed.scenes;
  if (!Array.isArray(scenes) || scenes.length !== spec.scene_count) {
    console.error(`❌ 씬 수 불일치: 기대 ${spec.scene_count}씬, 실제 ${scenes?.length || 0}씬`);
    process.exit(1);
  }

  const total = scenes.reduce((a, s) => a + (s.target_seconds || (spec.target_total_seconds / spec.scene_count)), 0);

  // Frontmatter 조립
  const outFM = {
    episode_id: episodeId,
    channel_id: channel,
    format,
    persona,
    target_total_seconds: total,
    language: 'ko',
    writer: 'writer-agent (gemini)',
    created_at: new Date().toISOString(),
    revision: 1,
  };
  if (fm.series_id) {
    outFM.series_id = fm.series_id;
    outFM.series_episode = fm.series_episode;
    if (fm.series_total) outFM.series_total = fm.series_total;
  }
  if (fm.parent_episode_id) outFM.parent_episode_id = fm.parent_episode_id;
  outFM.scenes = scenes;

  const scriptBody = [
    '---',
    stringifyYAML(outFM).trim(),
    '---',
    '',
    `# ${episodeId} Script (auto-generated, format=${format})`,
    '',
    `## 주제`,
    topic,
    '',
    `## 앵글`,
    parsed.angle_summary || '(no summary)',
    '',
    refs ? `## 레퍼런스\n05_topic_references.md 참조\n` : '',
  ].join('\n');

  // v2 layout: episodeDir/platforms/{platform}/30_script.md (platforms/ 디렉토리가 이미 있으면 v2)
  // v1 layout: episodeDir/30_script.md (legacy)
  const platform = format === 'long-3min' ? 'long' : 'shorts';
  const v2BaseDir = join(epDir, 'platforms', platform);
  const isV2 = existsSync(join(epDir, 'platforms'));
  const outDir = isV2 ? v2BaseDir : epDir;
  if (isV2) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(outDir, { recursive: true });
  }
  const outPath = join(outDir, '30_script.md');
  writeFileSync(outPath, scriptBody, 'utf-8');

  console.log(`✅ Script saved: ${outPath}`);
  console.log(`   Scenes: ${scenes.length}, total target: ${total}s (spec ${spec.target_total_seconds}s)`);
  console.log(`   Angle: ${parsed.angle_summary || '-'}`);
  scenes.forEach(s => {
    const chars = s.narration?.length || 0;
    console.log(`   [${s.scene_id}/${s.role}] ${s.target_seconds}s · ${chars}자 · "${s.narration?.slice(0, 40) || ''}..."`);
  });
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
