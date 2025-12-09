import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();

    // exam_questions와 questions를 JOIN해서 조회
    const { data, error } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_index,
        points_override,
        questions (*)
      `)
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Questions fetch error:', error);
      return NextResponse.json(
        { error: '문제 조회 실패', details: error.message },
        { status: 500 }
      );
    }

    // 데이터 재구성
    const questions = data.map((item: any) => ({
      ...item.questions,
      order_index: item.order_index,
      points_override: item.points_override,
      effective_points: item.points_override || item.questions.points,
    }));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
