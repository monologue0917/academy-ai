import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/excel';
import { ImportQuestionsResponse, Question } from '@/types/exam';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    
    // 엑셀 파싱
    let excelQuestions;
    try {
      excelQuestions = parseExcelFile(arrayBuffer);
    } catch (parseError: any) {
      return NextResponse.json(
        { error: '엑셀 파싱 실패', details: parseError.message },
        { status: 400 }
      );
    }

    if (excelQuestions.length === 0) {
      return NextResponse.json(
        { error: '문제가 없습니다' },
        { status: 400 }
      );
    }

    // TODO: 실제로는 세션에서 가져오기
    const academyId = '11111111-1111-1111-1111-111111111111';

    // questions 테이블에 INSERT
    const questionsToInsert = excelQuestions.map((q) => ({
      academy_id: academyId,
      type: q.type,
      content: q.content,
      passage: q.passage,
      choices: q.choices,
      correct_answer: q.correctAnswer,
      points: q.points,
      difficulty: q.difficulty,
      tags: q.tags,
      category: q.tags[0] || null,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Question insert error:', insertError);
      return NextResponse.json(
        { error: '문제 저장 실패', details: insertError.message },
        { status: 500 }
      );
    }

    // exam_questions 테이블에 매핑
    const examQuestions = insertedQuestions!.map((question, index) => {
      const excelQuestion = excelQuestions[index];
      return {
        exam_id: examId,
        question_id: question.id,
        order_index: excelQuestion?.order ?? index + 1,
        points_override: null,
      };
    });

    const { error: mappingError } = await supabase
      .from('exam_questions')
      .insert(examQuestions);

    if (mappingError) {
      console.error('Exam question mapping error:', mappingError);
      return NextResponse.json(
        { error: '문제 매핑 실패', details: mappingError.message },
        { status: 500 }
      );
    }

    // 총점 계산
    const totalPoints = excelQuestions.reduce((sum, q) => sum + q.points, 0);

    // 시험 total_points 업데이트
    const { error: updateError } = await supabase
      .from('exams')
      .update({ total_points: totalPoints })
      .eq('id', examId);

    if (updateError) {
      console.error('Exam update error:', updateError);
    }

    const response: ImportQuestionsResponse = {
      success: true,
      questions: insertedQuestions as Question[],
      totalPoints,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
