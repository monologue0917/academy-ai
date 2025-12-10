/**
 * GET /api/admin/classes
 * 
 * 반 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json(
        { success: false, error: 'academyId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 반 목록 조회
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, description, grade, is_active, teacher_id')
      .eq('academy_id', academyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (classesError) {
      console.error('[Classes API] Error:', classesError);
      return NextResponse.json(
        { success: false, error: '반 목록 조회 실패', details: classesError.message },
        { status: 500 }
      );
    }

    // 각 반의 학생 수 + 선생님 정보 조회
    const classesWithDetails = await Promise.all(
      (classes || []).map(async (cls) => {
        // 학생 수
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('is_active', true);

        // 선생님 정보
        let teacher = null;
        if (cls.teacher_id) {
          const { data: teacherData } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', cls.teacher_id)
            .single();
          teacher = teacherData;
        }

        return {
          id: cls.id,
          name: cls.name,
          description: cls.description,
          grade: cls.grade,
          teacher,
          studentCount: count || 0,
        };
      })
    );

    // JS에서 정렬: grade(내림차순) → name(오름차순)
    const gradeOrder: Record<string, number> = {
      '고3': 1, '고2': 2, '고1': 3,
      '중3': 4, '중2': 5, '중1': 6,
    };

    classesWithDetails.sort((a, b) => {
      const gradeA = gradeOrder[a.grade || ''] || 99;
      const gradeB = gradeOrder[b.grade || ''] || 99;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

    return NextResponse.json({
      success: true,
      classes: classesWithDetails,
    });

  } catch (error: any) {
    console.error('[Classes API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    );
  }
}
