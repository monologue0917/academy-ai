/**
 * GET /api/student/exams/[examId]/questions
 * 
 * 기능: 시험 문제 조회 (학생용 - 정답 제외)
 * 
 * 실제 DB 스키마:
 * - exams: id, title, description, time_limit_minutes, total_points
 * - exam_questions: exam_id, question_id, order_num, points
 * - questions: id, type, content, choices (NOT options), metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const currentStudentId = searchParams.get('studentId');

    console.log('[Student Questions] examId:', examId, 'studentId:', currentStudentId);

    if (!currentStudentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 시험 정보 조회 (실제 스키마)
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, time_limit_minutes, total_points, instructions')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('[Student Questions] 시험 조회 실패:', examError);
      return NextResponse.json(
        { success: false, error: '시험을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status, start_time, end_time')
      .eq('exam_id', examId)
      .eq('student_id', currentStudentId)
      .single();

    if (assignError || !assignment) {
      console.error('[Student Questions] 배정 확인 실패:', assignError);
      return NextResponse.json(
        { success: false, error: '배정된 시험이 아닙니다' },
        { status: 403 }
      );
    }

    // 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return NextResponse.json(
        { success: false, error: '시험 기간이 종료되었습니다' },
        { status: 403 }
      );
    }

    // 3. 문제 목록 조회 (order_num 순서, 실제 스키마)
    const { data: examQuestions, error: questionsError } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_num,
        points,
        question:questions(
          id,
          type,
          content,
          choices,
          metadata
        )
      `)
      .eq('exam_id', examId)
      .order('order_num', { ascending: true });

    if (questionsError) {
      console.error('[Student Questions] 문제 조회 실패:', questionsError);
      return NextResponse.json(
        { success: false, error: '문제 조회 실패' },
        { status: 500 }
      );
    }

    console.log('[Student Questions] 문제 수:', examQuestions?.length || 0);

    // 4. 응답 구성 (정답은 제외!)
    const questions = examQuestions?.map((eq) => {
      // question 데이터 안전하게 추출
      const questionData = eq.question as any;
      const question = Array.isArray(questionData)
        ? questionData[0]
        : questionData;

      // metadata에서 passage 추출 (있으면)
      const passage = (question?.metadata as Record<string, unknown>)?.passage || null;
      
      return {
        id: question?.id || '',
        examQuestionId: eq.id,
        orderNum: eq.order_num,
        type: question?.type || 'multiple_choice',
        content: question?.content || '',
        passage: passage,
        choices: question?.choices || [],
        points: eq.points || 2,
        // 정답은 제외! (correct_answer 없음)
      };
    }) || [];

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.time_limit_minutes,
        timeLimitMinutes: exam.time_limit_minutes,
        totalPoints: exam.total_points,
        instructions: exam.instructions,
      },
      assignment: {
        id: assignment.id,
        status: assignment.status,
        startTime: assignment.start_time,
        endTime: assignment.end_time,
      },
      questions,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error('[Student Questions] 전체 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
