/**
 * GET /api/student/review/today
 * 
 * 기능: 오늘의 복습 문제 10개 추천
 * 
 * 로직:
 * 1. wrong_notes에서 mastered = false인 문제들
 * 2. times_wrong 높은 순 정렬
 * 3. last_wrong_at 최근 순 정렬
 * 4. LIMIT 10
 * 
 * 응답:
 * - questions: 복습 문제 리스트
 * - totalWrong: 전체 오답 수
 * - reviewedToday: 오늘 복습한 수
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // TODO: 실제 인증
    const { searchParams } = new URL(request.url);
    const currentStudentId = searchParams.get('studentId');

    if (!currentStudentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. wrong_notes 조회 (복습 대상 문제)
    const { data: wrongNotes, error: wnError } = await supabase
      .from('wrong_notes')
      .select(
        `
        id,
        question_id,
        student_answer,
        correct_answer,
        times_wrong,
        last_wrong_at,
        review_count,
        mastered,
        question:questions(
          id,
          type,
          content,
          passage,
          options,
          correct_answer,
          explanation,
          points
        )
      `
      )
      .eq('student_id', currentStudentId)
      .eq('mastered', false)
      .order('times_wrong', { ascending: false })
      .order('last_wrong_at', { ascending: false })
      .limit(10);

    if (wnError) {
      console.error('Error fetching wrong notes:', wnError);
      return NextResponse.json(
        { success: false, error: '오답 조회 실패' },
        { status: 500 }
      );
    }

    // 2. 전체 오답 수 조회
    const { count: totalWrong } = await supabase
      .from('wrong_notes')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', currentStudentId)
      .eq('mastered', false);

    // 3. 오늘 복습한 문제 수 조회 (review_count 증가 기록)
    // TODO: 실제로는 별도 review_sessions 테이블 필요
    const reviewedToday = 0;

    // 4. 데이터 변환
    const questions = wrongNotes?.map((wn) => {
      const question = Array.isArray(wn.question) ? wn.question[0] : wn.question;
      return {
        wrongNoteId: wn.id,
        questionId: question?.id || wn.question_id,
        type: question?.type || 'mcq',
        content: question?.content || '',
        passage: question?.passage || null,
        options: question?.options || null,
        correctAnswer: question?.correct_answer || wn.correct_answer,
        explanation: question?.explanation || null,
        points: question?.points || 0,
        
        // 오답 정보
        studentAnswer: wn.student_answer,
        timesWrong: wn.times_wrong,
        lastWrongAt: wn.last_wrong_at,
        reviewCount: wn.review_count,
        mastered: wn.mastered,
      };
    }) || [];

    // 5. 응답
    return NextResponse.json({
      success: true,
      questions,
      stats: {
        totalWrong: totalWrong || 0,
        reviewedToday,
        todayLimit: 10,
        remaining: Math.max(0, (totalWrong || 0) - 10),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /student/review/today:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
