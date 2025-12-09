/**
 * POST /api/ai/explain
 * 
 * AI 문제 해설 생성 API v3
 * 
 * - GPT-4o-mini
 * - System/User 프롬프트 분리
 * - JSON 모드
 * - 캐싱 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExplanation } from '@/lib/ai/openai';
import { 
  SYSTEM_PROMPT, 
  buildUserPrompt, 
  separatePassageAndQuestion,
  getQuestionType,
} from '@/lib/ai/prompts';
import { AIExplanation } from '@/types/ai';

interface ExplainRequest {
  questionId: string;
  studentAnswer: string;
  correctAnswer?: string;
  orderNum?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExplainRequest = await request.json();
    const { questionId, studentAnswer, correctAnswer: providedCorrectAnswer, orderNum } = body;

    console.log('[AI Explain] questionId:', questionId, 'studentAnswer:', studentAnswer, 'orderNum:', orderNum);

    if (!questionId || !studentAnswer) {
      return NextResponse.json(
        { success: false, error: '문제 ID와 학생 답안이 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. 캐시 확인
    const cacheKey = `${questionId}_${studentAnswer}`;

    const { data: cached } = await supabase
      .from('ai_explanations_cache')
      .select('explanation, created_at')
      .eq('cache_key', cacheKey)
      .single();

    if (cached) {
      console.log('[AI Explain] 캐시 히트!');
      try {
        const parsed = JSON.parse(cached.explanation);
        return NextResponse.json({
          success: true,
          explanation: parsed,
          fromCache: true,
        });
      } catch {
        // 캐시 파싱 실패 시 재생성
        console.log('[AI Explain] 캐시 파싱 실패, 재생성');
      }
    }

    // 2. 문제 정보 조회
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, type, content, choices, correct_answer, explanation, metadata')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      console.error('[AI Explain] 문제 조회 실패:', questionError);
      return NextResponse.json(
        { success: false, error: '문제를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const correctAnswer = providedCorrectAnswer || question.correct_answer;

    // 3. 지문/질문 분리
    const { passage, question: questionText } = separatePassageAndQuestion(question.content);

    // 4. User 프롬프트 생성
    const userPrompt = buildUserPrompt({
      questionNumber: orderNum,
      questionType: getQuestionType(orderNum),
      studentChoice: studentAnswer,
      correctChoice: correctAnswer,
      passageEnglish: passage || question.content,
      questionKorean: questionText || '다음 글의 내용으로 가장 적절한 것은?',
      choices: question.choices || [],
    });

    console.log('[AI Explain] GPT-4o-mini 호출 시작...');
    const startTime = Date.now();

    // 5. GPT-4o-mini 호출
    const aiResponse = await generateExplanation<AIExplanation>(
      SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.5, maxTokens: 1000 }
    );

    const elapsed = Date.now() - startTime;
    console.log('[AI Explain] GPT 응답 완료:', elapsed, 'ms');

    // 6. 캐시 저장
    try {
      await supabase
        .from('ai_explanations_cache')
        .upsert({
          cache_key: cacheKey,
          question_id: questionId,
          student_answer: studentAnswer,
          correct_answer: correctAnswer,
          explanation: JSON.stringify(aiResponse),
          model: 'gpt-4o-mini',
          created_at: new Date().toISOString(),
        });
      console.log('[AI Explain] 캐시 저장 성공');
    } catch (cacheError) {
      console.error('[AI Explain] 캐시 저장 실패:', cacheError);
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      explanation: aiResponse,
      fromCache: false,
      responseTime: elapsed,
    });
  } catch (error: unknown) {
    console.error('[AI Explain] 전체 오류:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('API')) {
      return NextResponse.json(
        { success: false, error: 'AI 서비스 일시 오류입니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
