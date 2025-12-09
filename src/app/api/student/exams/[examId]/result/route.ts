/**
 * GET /api/student/exams/[examId]/result
 * 
 * 시험 결과 조회
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS, type SubmissionMetadata } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json(
        { success: false, error: '시험 기록을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (assignment.status !== ASSIGNMENT_STATUS.COMPLETED) {
      return NextResponse.json(
        { success: false, error: '아직 제출하지 않은 시험입니다' },
        { status: 400 }
      );
    }

    // 2. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { success: false, error: '시험을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 3. 제출 결과 조회
    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', assignment.id)
      .eq('assignment_type', 'exam')
      .single();

    // 4. 문제 정보 조회
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        id,
        question_id,
        order_num,
        points,
        question:questions(
          id,
          type,
          content,
          choices,
          correct_answer,
          explanation
        )
      `)
      .eq('exam_id', examId)
      .order('order_num', { ascending: true });

    // 5. metadata에서 answers 추출
    const metadata = submission?.metadata as SubmissionMetadata | null;
    const savedAnswers = metadata?.answers || [];
    const savedAnswersMap = new Map(
      savedAnswers.map(a => [a.questionId, a])
    );

    // 6. 결과 구성
    const answers = (examQuestions || []).map(eq => {
      // question 데이터 안전하게 추출
      const questionData = eq.question as any;
      const question = Array.isArray(questionData)
        ? questionData[0]
        : questionData;

      const savedAnswer = savedAnswersMap.get(eq.question_id);

      return {
        questionId: question?.id || eq.question_id,
        orderNum: eq.order_num,
        type: question?.type || 'multiple_choice',
        content: question?.content || '',
        choices: question?.choices || [],
        studentAnswer: savedAnswer?.studentAnswer || '',
        correctAnswer: question?.correct_answer || '',
        isCorrect: savedAnswer?.isCorrect || false,
        points: eq.points || 2,
        earnedPoints: savedAnswer?.earnedPoints || 0,
        explanation: question?.explanation || null,
      };
    });

    const totalScore = submission?.score || 0;
    const maxScore = submission?.max_score || exam.total_points || 0;
    const percentage = maxScore > 0 ? (Number(totalScore) / maxScore) * 100 : 0;
    const correctCount = answers.filter(a => a.isCorrect).length;

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        questionCount: examQuestions?.length || 0,
      },
      result: {
        score: Number(totalScore),
        totalScore: maxScore,
        percentage,
        correctCount,
        totalCount: answers.length,
        completedAt: submission?.submitted_at || new Date().toISOString(),
      },
      answers,
    });
  } catch (error) {
    console.error('[Result API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
