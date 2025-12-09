/**
 * POST /api/admin/classes/[classId]/add-student
 * 
 * 학생을 반에 추가
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const body = await request.json();
    const { studentId } = body;

    console.log('[Add Student] classId:', classId, 'studentId:', studentId);

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. 이미 등록되어 있는지 확인
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id, is_active')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json(
          { success: false, error: '이미 이 반에 등록된 학생입니다' },
          { status: 400 }
        );
      } else {
        // 비활성 상태면 다시 활성화
        const { error: updateError } = await supabase
          .from('class_enrollments')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          return NextResponse.json(
            { success: false, error: '학생 추가 실패' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }
    }

    // 2. 새로 등록
    const { error: insertError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: studentId,
        is_active: true,
      });

    if (insertError) {
      console.error('Add student error:', insertError);
      return NextResponse.json(
        { success: false, error: '학생 추가 실패', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Add student error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
