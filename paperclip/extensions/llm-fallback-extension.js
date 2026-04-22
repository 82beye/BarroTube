/**
 * Paperclip Extension: LLM Fallback Chain
 * PRD §5.2: 1차 Anthropic → 2차 Gemini → 3차 OpenAI
 *
 * 보고서 2장의 _call_llm_with_fallback 패턴을 Paperclip extension으로 구현
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSecret } from '../../scripts/automation/config-loader.js';

const CONFIG_PATH = resolve(import.meta.dirname, '../config/llm-fallback.json');

/**
 * API 키를 조회한다 (.env → 환경변수 → Keychain)
 */
function getApiKey(keychainRef) {
  const serviceName = keychainRef.replace('keychain:', '');
  return getSecret(serviceName);
}

/**
 * LLM 호출 with Fallback
 */
export async function callLLMWithFallback(prompt, options = {}) {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const providers = config.llm_fallback_chain.providers;
  const modelTier = options.modelTier || 'sonnet'; // opus | sonnet | haiku

  for (const provider of providers) {
    const apiKey = getApiKey(provider.key_source);
    if (!apiKey) {
      console.warn(`[LLM Fallback] No API key for ${provider.name}, skipping`);
      continue;
    }

    const model = provider.models[modelTier];
    if (!model) continue;

    try {
      console.log(`[LLM Fallback] Trying ${provider.name} (${model})...`);
      const startTime = Date.now();

      const result = await callProvider(provider.name, {
        apiBase: provider.api_base,
        apiKey,
        model,
        prompt,
        timeout: provider.timeout_ms,
        ...options,
      });

      const elapsed = Date.now() - startTime;
      console.log(`[LLM Fallback] ${provider.name} responded in ${elapsed}ms`);

      return {
        provider: provider.name,
        model,
        result,
        elapsed,
        fallback: provider.priority > 1,
      };
    } catch (err) {
      console.warn(`[LLM Fallback] ${provider.name} failed: ${err.message}`);
      if (provider.priority < providers.length) {
        console.log(`[LLM Fallback] Falling back to next provider...`);
      }
    }
  }

  throw new Error('All LLM providers failed');
}

/**
 * 공급자별 API 호출
 */
async function callProvider(providerName, opts) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

  try {
    switch (providerName) {
      case 'anthropic':
        return await callAnthropic(opts, controller.signal);
      case 'google':
        return await callGoogle(opts, controller.signal);
      case 'openai':
        return await callOpenAI(opts, controller.signal);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAnthropic(opts, signal) {
  const response = await fetch(`${opts.apiBase}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens || 4096,
      messages: [{ role: 'user', content: opts.prompt }],
      ...(opts.system ? { system: opts.system } : {}),
    }),
    signal,
  });

  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.content[0].text;
}

async function callGoogle(opts, signal) {
  const response = await fetch(
    `${opts.apiBase}/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: opts.prompt }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens || 4096 },
      }),
      signal,
    }
  );

  if (!response.ok) throw new Error(`Google ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(opts, signal) {
  const response = await fetch(`${opts.apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens || 4096,
      messages: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: opts.prompt },
      ],
    }),
    signal,
  });

  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}
