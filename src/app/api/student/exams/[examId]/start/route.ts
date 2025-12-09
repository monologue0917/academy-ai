/**
 * POST /api/student/exams/[examId]/start
 * 
 * 시험 시작
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();

    let studentId: string | null = null;
    try {
      const body = await request.json();
      studentId = body.studentId;
    } catch {
      // body 파싱 실패
    }

    if (!studentId) {
      const { searchParams } = new URL(request.url);
      studentId = searchParams.get('studentId');
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 시험 확인
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
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
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json(
        { success: false, error: '배정된 시험이 아닙니다' },
        { status: 403 }
      );
    }

    // 3. 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return NextResponse.json(
        { success: false, error: '시험 기간이 종료되었습니다' },
        { status: 403 }
      );
    }

    // 4. 상태 확인
    if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
      return NextResponse.json(
        { success: false, error: '이미 제출한 시험입니다' },
        { status: 400 }
      );
    }

    if (assignment.status === ASSIGNMENT_STATUS.CANCELLED) {
      return NextResponse.json(
        { success: false, error: '취소된 시험입니다' },
        { status: 400 }
      );
    }

    // 이미 ongoing이면 바로 성공
    if (assignment.status === ASSIGNMENT_STATUS.ONGOING) {
      return NextResponse.json({
        success: true,
        assignmentId: assignment.id,
        message: '이미 시작된 시험입니다',
      });
    }

    // 5. ongoing으로 업데이트
    const { error: updateError } = await supabase
      .from('exam_assignments')
      .update({ status: ASSIGNMENT_STATUS.ONGOING })
      .eq('id', assignment.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '시험 시작 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      message: '시험이 시작되었습니다',
    });
  } catch (error) {
    console.error('[Exam Start] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
