import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

// Supabase client 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key 사용 (RLS 우회)
);

/**
 * POST /api/admin/exams/import
 * 
 * 엑셀 파일을 업로드하여 시험 생성
 * 
 * FormData:
 * - file: 엑셀 파일
 * - examData: JSON { title, classId, scheduledAt, durationMinutes }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const examDataStr = formData.get('examData') as string;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    if (!examDataStr) {
      return NextResponse.json(
        { error: '시험 정보가 없습니다' },
        { status: 400 }
      );
    }

    const examData = JSON.parse(examDataStr);

    // 2. 파일 검증
    if (!file.type.includes('spreadsheet') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: '엑셀 파일(.xlsx)만 업로드 가능합니다' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다' },
        { status: 400 }
      );
    }

    // 3. 엑셀 파일 읽기
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('문제 목록');
    if (!worksheet) {
      return NextResponse.json(
        { error: '"문제 목록" 시트를 찾을 수 없습니다' },
        { status: 422 }
      );
    }

    // 4. 엑셀 데이터 파싱
    const questions: ParsedQuestion[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // 헤더 행(1행) 스킵
      if (rowNumber === 1) return;

      try {
        const questionNumber = Number(row.getCell(1).value);
        const questionType = String(row.getCell(2).value).trim();
        const questionText = String(row.getCell(3).value || '').trim();
        const choicesStr = String(row.getCell(4).value || '').trim();
        const correctAnswer = String(row.getCell(5).value || '').trim();
        const score = Number(row.getCell(6).value) || 1;

        // Validation
        if (!questionNumber || isNaN(questionNumber)) {
          errors.push(`${rowNumber}행: 문제 번호가 유효하지 않습니다`);
          return;
        }

        if (!['mcq', 'short_answer', 'essay'].includes(questionType)) {
          errors.push(`${rowNumber}행: 문제 유형이 유효하지 않습니다 (mcq, short_answer, essay 중 선택)`);
          return;
        }

        if (!questionText) {
          errors.push(`${rowNumber}행: 문제 지문이 비어있습니다`);
          return;
        }

        if (!correctAnswer) {
          errors.push(`${rowNumber}행: 정답이 비어있습니다`);
          return;
        }

        // choices 파싱
        let choices: string[] | null = null;
        if (questionType === 'mcq') {
          if (!choicesStr) {
            errors.push(`${rowNumber}행: 객관식 문제는 보기가 필요합니다`);
            return;
          }
          choices = choicesStr.split('||').map(s => s.trim()).filter(Boolean);
          if (choices.length < 2 || choices.length > 5) {
            errors.push(`${rowNumber}행: 보기는 2~5개여야 합니다`);
            return;
          }
        }

        questions.push({
          questionNumber,
          type: questionType as 'mcq' | 'short_answer' | 'essay',
          content: questionText,
          options: choices,
          correctAnswer,
          points: score,
        });
      } catch (error) {
        errors.push(`${rowNumber}행: 데이터 파싱 오류`);
      }
    });

    // 파싱 에러 체크
    if (errors.length > 0) {
      return NextResponse.json(
        { error: '엑셀 데이터 검증 실패', details: errors },
        { status: 422 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: '문제가 없습니다' },
        { status: 422 }
      );
    }

    // 문제 번호 중복 체크
    const questionNumbers = questions.map(q => q.questionNumber);
    const duplicates = questionNumbers.filter((num, idx) => 
      questionNumbers.indexOf(num) !== idx
    );
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: `중복된 문제 번호가 있습니다: ${duplicates.join(', ')}` },
        { status: 422 }
      );
    }

    // 5. Total points 계산
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    // 6. Due date 계산
    const scheduledAt = new Date(examData.scheduledAt);
    const dueAt = new Date(scheduledAt.getTime() + examData.durationMinutes * 60 * 1000);

    // 7. Exam 생성
    // DB 스키마에 맞게 필수 필드만 포함 (allow_retry 등 제외)
    const examInsert = {
      academy_id: 'a0000000-0000-0000-0000-000000000001',
      class_id: examData.classId,
      created_by: 'u0000000-0000-0000-0000-000000000001',
      title: examData.title,
      description: null,
      duration: examData.durationMinutes,
      total_points: totalPoints,
      pass_score: null,
      scheduled_at: scheduledAt.toISOString(),
      due_at: dueAt.toISOString(),
      status: 'draft',
    };

    console.log('[Import] Creating exam:', examInsert);

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert(examInsert)
      .select()
      .single();

    if (examError || !exam) {
      console.error('Exam insert error:', examError);
      return NextResponse.json(
        { error: '시험 생성 실패', details: examError?.message },
        { status: 500 }
      );
    }

    console.log('[Import] Exam created:', exam.id);

    // 8. Questions 생성 (batch insert)
    const questionInserts = questions.map(q => ({
      academy_id: 'a0000000-0000-0000-0000-000000000001',
      created_by: 'u0000000-0000-0000-0000-000000000001',
      type: q.type,
      content: q.content,
      passage: null,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: null,
      points: q.points,
      category: null,
      difficulty: null,
      tags: [],
      source: null,
      is_active: true,
    }));

    const { data: createdQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionInserts)
      .select();

    if (questionsError || !createdQuestions) {
      console.error('Questions insert error:', questionsError);
      // 롤백: exam 삭제
      await supabase.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { error: '문제 생성 실패', details: questionsError?.message },
        { status: 500 }
      );
    }

    console.log('[Import] Questions created:', createdQuestions.length);

    // 9. ExamQuestions 연결 (batch insert)
    const examQuestionInserts = questions.map((q, idx) => ({
      exam_id: exam.id,
      question_id: createdQuestions[idx].id,
      order_index: q.questionNumber,
      points_override: null,
    }));

    const { error: examQuestionsError } = await supabase
      .from('exam_questions')
      .insert(examQuestionInserts);

    if (examQuestionsError) {
      console.error('ExamQuestions insert error:', examQuestionsError);
      // 롤백: questions, exam 삭제
      await supabase.from('questions').delete().in('id', createdQuestions.map(q => q.id));
      await supabase.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { error: '시험-문제 연결 실패', details: examQuestionsError.message },
        { status: 500 }
      );
    }

    console.log('[Import] Exam-Questions linked');

    // 10. 성공 응답
    return NextResponse.json({
      success: true,
      examId: exam.id,
      questionCount: questions.length,
      totalPoints,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================
// Types
// ============================================

interface ParsedQuestion {
  questionNumber: number;
  type: 'mcq' | 'short_answer' | 'essay';
  content: string;
  options: string[] | null;
  correctAnswer: string;
  points: number;
}
