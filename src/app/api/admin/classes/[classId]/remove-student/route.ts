/**
 * POST /api/admin/classes/[classId]/remove-student
 * 
 * 학생을 반에서 제거 (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const body = await request.json();
    const { enrollmentId } = body;

    console.log('[Remove Student] classId:', classId, 'enrollmentId:', enrollmentId);

    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, error: 'enrollmentId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Soft delete (is_active = false)
    const { error } = await supabase
      .from('class_enrollments')
      .update({ is_active: false })
      .eq('id', enrollmentId);

    if (error) {
      console.error('Remove student error:', error);
      return NextResponse.json(
        { success: false, error: '학생 제거 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Remove student error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
