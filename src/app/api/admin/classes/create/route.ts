/**
 * POST /api/admin/classes/create
 * 
 * 새 반 생성 API
 * 생성 후 같은 연결에서 업데이트된 목록을 반환 (Supabase 복제 지연 우회)
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { academyId, teacherId, grade, name, description } = body;

    if (!academyId || !name) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: '담당 선생님 정보가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 반 이름 조합: "고3 수능반" 형식
    const fullName = grade ? `${grade} ${name}` : name;

    // 반 생성
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        academy_id: academyId,
        teacher_id: teacherId,
        name: fullName,
        grade: grade || null,
        description: description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Class Create] Error:', error);
      return NextResponse.json(
        { success: false, error: '반 생성에 실패했습니다', details: error.message },
        { status: 500 }
      );
    }

    // 생성 후 같은 연결에서 업데이트된 목록 반환
    const { data: updatedClasses } = await supabase
      .from('classes')
      .select('id, name, description, grade, is_active, teacher_id')
      .eq('academy_id', academyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // 각 반의 학생 수 + 선생님 정보 조회
    const classesWithDetails = await Promise.all(
      (updatedClasses || []).map(async (cls) => {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('is_active', true);

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
      class: newClass,
      classes: classesWithDetails,
    });

  } catch (error: any) {
    console.error('[Class Create] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
