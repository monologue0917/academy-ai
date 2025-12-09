/**
 * DELETE /api/admin/exams/[examId]/assignments
 * 
 * 기능: 특정 배정 삭제 또는 전체 배정 삭제
 * 
 * Query params:
 * - assignmentId: 특정 배정만 삭제
 * - studentId: 특정 학생의 배정만 삭제
 * - (없으면) 전체 배정 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const studentId = searchParams.get('studentId');
    
    const supabase = createClient();

    console.log('[Assignment Delete] examId:', examId, 'assignmentId:', assignmentId, 'studentId:', studentId);

    let query = supabase
      .from('exam_assignments')
      .delete()
      .eq('exam_id', examId);

    if (assignmentId) {
      // 특정 배정만 삭제
      query = query.eq('id', assignmentId);
    } else if (studentId) {
      // 특정 학생의 배정만 삭제
      query = query.eq('student_id', studentId);
    }
    // 둘 다 없으면 해당 시험의 모든 배정 삭제

    const { error, count } = await query.select();

    if (error) {
      console.error('[Assignment Delete] 삭제 오류:', error);
      return NextResponse.json(
        { success: false, error: '배정 삭제 실패', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Assignment Delete] 삭제 완료');

    return NextResponse.json({
      success: true,
      message: '배정이 삭제되었습니다',
    });
  } catch (error) {
    console.error('[Assignment Delete] 전체 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
