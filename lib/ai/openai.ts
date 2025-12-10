/**
 * OpenAI API 클라이언트 v3
 * 
 * ⚠️ 서버 전용! 클라이언트에서 import 금지
 * 
 * GPT-4o-mini + JSON 모드 + System/User 분리
 */

import OpenAI from 'openai';
import { getServerConfig } from '@/lib/config/env';

// 싱글톤 클라이언트
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const config = getServerConfig();
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }
  return openaiClient;
}

/**
 * AI 해설 생성 (System + User 프롬프트 분리)
 */
export async function generateExplanation<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<T> {
  try {
    const config = getServerConfig();
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: options?.model || config.openaiModelText,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.5,
      max_tokens: options?.maxTokens ?? 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';

    try {
      return JSON.parse(content) as T;
    } catch {
      // 백틱 제거 후 재시도
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleaned) as T;
    }
  } catch (error: unknown) {
    console.error('[OpenAI] API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`AI 생성 실패: ${message}`);
  }
}

/**
 * 일반 텍스트 Completion (기존 호환용)
 */
export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  try {
    const config = getServerConfig();
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: options?.model || config.openaiModelText,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: unknown) {
    console.error('[OpenAI] API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`AI 생성 실패: ${message}`);
  }
}

// 기존 호환용 export
export const openai = {
  get instance() {
    return getOpenAI();
  }
};
