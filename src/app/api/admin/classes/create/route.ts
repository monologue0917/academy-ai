/**
 * POST /api/admin/classes/create
 * 
 * 새 반 생성 API
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
      console.error('Class creation error:', error);
      return NextResponse.json(
        { success: false, error: '반 생성에 실패했습니다', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      class: newClass,
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
