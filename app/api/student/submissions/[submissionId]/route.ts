/**
 * GET /api/student/submissions/[submissionId]
 * 
 * 기능: 제출 결과 조회
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const currentStudentId = searchParams.get('studentId');

    if (!currentStudentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. submission 조회
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select(`
        id,
        assignment_type,
        assignment_id,
        student_id,
        status,
        started_at,
        submitted_at,
        time_spent_seconds,
        score,
        max_score,
        graded_at,
        metadata
      `)
      .eq('id', submissionId)
      .eq('student_id', currentStudentId)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { success: false, error: '제출 기록을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. exam_id 추출 (metadata에서)
    const metadata = submission.metadata as { exam_id?: string } | null;
    const examId = metadata?.exam_id;

    // 3. 시험 정보 조회
    let exam = null;
    if (examId) {
      const { data: examData } = await supabase
        .from('exams')
        .select('id, title, description, total_points')
        .eq('id', examId)
        .single();
      exam = examData;
    }

    // 4. 응답 구성
    const percentage = submission.max_score > 0 
      ? ((Number(submission.score) / submission.max_score) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        startedAt: submission.started_at,
        submittedAt: submission.submitted_at,
        timeSpent: submission.time_spent_seconds,
        score: submission.score,
        maxScore: submission.max_score,
        percentage,
        gradedAt: submission.graded_at,
      },
      exam: exam || { id: examId, title: '시험', total_points: 0 },
      answers: [],
      stats: {
        correctCount: 0,
        totalCount: 0,
        wrongCount: 0,
        accuracy: '0.0',
      },
    });
  } catch (error: any) {
    console.error('Unexpected error in GET submission:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
