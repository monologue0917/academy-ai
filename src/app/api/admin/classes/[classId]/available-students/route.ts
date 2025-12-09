/**
 * GET /api/admin/classes/[classId]/available-students
 * 
 * 이 반에 추가 가능한 학생 목록 (아직 이 반에 없는 학생들)
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    console.log('[Available Students] classId:', classId, 'academyId:', academyId);

    if (!academyId) {
      return NextResponse.json(
        { success: false, error: 'academyId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. 이 반에 이미 등록된 학생 ID 목록
    const { data: existingEnrollments } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('is_active', true);

    const existingStudentIds = (existingEnrollments || []).map(e => e.student_id);

    // 2. 학원의 모든 학생 중 이 반에 없는 학생들
    let query = supabase
      .from('users')
      .select('id, name, email')
      .eq('academy_id', academyId)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('name', { ascending: true });

    // 이미 등록된 학생 제외
    if (existingStudentIds.length > 0) {
      query = query.not('id', 'in', `(${existingStudentIds.join(',')})`);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Available students error:', error);
      return NextResponse.json(
        { success: false, error: '학생 목록 조회 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      students: students || [],
    });

  } catch (error: any) {
    console.error('Available students error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
