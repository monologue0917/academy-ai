/**
 * GET /api/admin/classes/[classId]
 * DELETE /api/admin/classes/[classId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    console.log('[Class Detail] Starting...');
    console.log('[Class Detail] context:', JSON.stringify(context));
    
    const { classId } = await context.params;
    console.log('[Class Detail] classId:', classId);
    
    // 환경 변수 확인
    console.log('[Class Detail] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
    console.log('[Class Detail] Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const supabase = createClient();

    // 1. 반 정보 조회
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('is_active', true)
      .single();

    console.log('[Class Detail] classData:', classData);
    console.log('[Class Detail] classError:', classError);

    if (classError || !classData) {
      return NextResponse.json(
        { success: false, error: '반을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 담당 선생님 정보
    let teacher = null;
    if (classData.teacher_id) {
      const { data: teacherData } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', classData.teacher_id)
        .single();
      teacher = teacherData;
    }

    // 3. 소속 학생 목록
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('id, student_id, created_at')
      .eq('class_id', classId)
      .eq('is_active', true);

    // 학생 정보 가져오기
    const students = [];
    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        const { data: student } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', enrollment.student_id)
          .single();
        
        if (student) {
          students.push({
            enrollmentId: enrollment.id,
            studentId: enrollment.student_id,
            name: student.name,
            email: student.email,
            enrolledAt: enrollment.created_at,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      classInfo: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        grade: classData.grade,
        teacher,
      },
      students,
    });

  } catch (error: any) {
    console.error('[Class Detail] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const supabase = createClient();

    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', classId);

    if (error) {
      return NextResponse.json(
        { success: false, error: '반 삭제 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: '서버 오류' },
      { status: 500 }
    );
  }
}
