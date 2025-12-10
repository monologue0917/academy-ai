import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseExamMarkdown, convertToDbFormat } from '@/lib/parsers/exam-markdown';
import { createClient } from '@supabase/supabase-js';


export const dynamic = 'force-dynamic';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/exams/from-markdown
 * 
 * 사용 가능한 마크다운 시험 파일 목록 조회
 */
export async function GET() {
  try {
    const examsDir = path.join(process.cwd(), 'src/data/exams');
    
    // 디렉토리 존재 확인
    try {
      await fs.access(examsDir);
    } catch {
      // 디렉토리 없으면 빈 배열 반환
      return NextResponse.json({
        success: true,
        exams: [],
      });
    }
    
    const files = await fs.readdir(examsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const exams = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const content = await fs.readFile(path.join(examsDir, filename), 'utf-8');
          const parsed = parseExamMarkdown(content);
          return {
            filename,
            id: parsed.id,
            title: parsed.title,
            subject: parsed.subject,
            totalQuestions: parsed.questions.length,
            startNumber: parsed.startNumber,
            endNumber: parsed.endNumber,
          };
        } catch (err) {
          console.error(`파일 파싱 실패: ${filename}`, err);
          return null;
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      exams: exams.filter(Boolean),
    });
  } catch (error) {
    console.error('마크다운 파일 목록 조회 실패:', error);
    return NextResponse.json(
      { error: '파일 목록 조회 실패', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exams/from-markdown
 * 
 * 마크다운 파일에서 시험 생성
 * 
 * 실제 DB 스키마:
 * 
 * [exams 테이블]
 * - id, academy_id, teacher_id, title, description
 * - total_points, time_limit_minutes, passing_score
 * - instructions, settings, created_at, updated_at
 * - allow_retry, shuffle_questions, show_answer_after
 * 
 * [questions 테이블]
 * - id, academy_id, teacher_id, type (ENUM), content, correct_answer
 * - choices, explanation, difficulty_level
 * - tags, source, metadata, created_at, updated_at
 * - ai_explanation, hints, ai_skill_tags, ai_generated_at, ai_model, created_by
 * 
 * [exam_questions 테이블]
 * - id, exam_id, question_id, order_num (NOT order_index), points, created_at
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, title: customTitle } = body;
    
    console.log('[MD Import] 요청:', { filename });
    
    if (!filename) {
      return NextResponse.json(
        { error: '파일명이 필요합니다' },
        { status: 400 }
      );
    }
    
    // 1. 마크다운 파일 읽기
    const examsDir = path.join(process.cwd(), 'src/data/exams');
    const filePath = path.join(examsDir, filename);
    
    console.log('[MD Import] 파일 경로:', filePath);
    
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
      console.log('[MD Import] 파일 읽기 성공, 길이:', content.length);
    } catch (err) {
      console.error('[MD Import] 파일 읽기 실패:', err);
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다', details: String(err) },
        { status: 404 }
      );
    }
    
    // 2. 파싱
    let parsed;
    let dbData;
    try {
      parsed = parseExamMarkdown(content);
      dbData = convertToDbFormat(parsed);
      console.log('[MD Import] 파싱 완료:', {
        title: parsed.title,
        questionCount: parsed.questions.length,
        firstQuestion: parsed.questions[0]?.questionNumber,
      });
    } catch (err) {
      console.error('[MD Import] 파싱 실패:', err);
      return NextResponse.json(
        { error: '파일 파싱 실패', details: String(err) },
        { status: 422 }
      );
    }
    
    if (dbData.questions.length === 0) {
      return NextResponse.json(
        { error: '문제를 추출할 수 없습니다' },
        { status: 422 }
      );
    }
    
    // 3. 기본 teacher 조회 (teacher_id 필수)
    const { data: defaultTeacher, error: teacherError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'teacher')
      .limit(1)
      .single();
    
    if (teacherError || !defaultTeacher) {
      console.error('[MD Import] 선생님 조회 실패:', teacherError);
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다', details: teacherError?.message },
        { status: 500 }
      );
    }
    
    console.log('[MD Import] 선생님 ID:', defaultTeacher.id);
    
    // 4. 시험 생성
    const examInsert = {
      academy_id: 'a0000000-0000-0000-0000-000000000001',
      teacher_id: defaultTeacher.id,
      title: customTitle || parsed.title,
      description: `${parsed.subject} - ${parsed.questions.length}문항`,
      time_limit_minutes: parsed.duration,
      total_points: dbData.examData.totalPoints,
      instructions: null,
      settings: {},
      allow_retry: false,
      shuffle_questions: false,
      show_answer_after: true,
    };
    
    console.log('[MD Import] 시험 데이터:', examInsert);
    
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert(examInsert)
      .select()
      .single();
    
    if (examError || !exam) {
      console.error('[MD Import] 시험 생성 실패:', examError);
      return NextResponse.json(
        { error: '시험 생성 실패', details: examError?.message },
        { status: 500 }
      );
    }
    
    console.log('[MD Import] 시험 생성 성공:', exam.id);
    
    // 5. 문제 생성
    // question_type ENUM: 가능한 값들 - 'multiple_choice', 'short_answer', 'essay' 등
    // mcq -> multiple_choice로 매핑
    const mapQuestionType = (type: string): string => {
      switch (type) {
        case 'mcq':
          return 'multiple_choice';
        case 'short_answer':
          return 'short_answer';
        case 'essay':
          return 'essay';
        default:
          return 'multiple_choice';
      }
    };
    
    const questionInserts = dbData.questions.map(q => ({
      academy_id: 'a0000000-0000-0000-0000-000000000001',
      teacher_id: defaultTeacher.id,
      created_by: defaultTeacher.id,
      type: mapQuestionType(q.type),  // ENUM 값 변환
      content: q.content || `${q.questionNumber}번 문제`,
      choices: q.options && q.options.length > 0 ? q.options : ['①', '②', '③', '④', '⑤'],
      correct_answer: q.correctAnswer,
      explanation: null,
      difficulty_level: 3,
      tags: [],
      source: parsed.title,
      metadata: {
        questionNumber: q.questionNumber,
        points: q.points,
        passage: q.passage || null,
      },
    }));
    
    console.log('[MD Import] 문제 데이터 샘플:', questionInserts[0]);
    
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionInserts)
      .select();
    
    if (questionsError || !questions) {
      console.error('[MD Import] 문제 생성 실패:', questionsError);
      await supabase.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { error: '문제 생성 실패', details: questionsError?.message },
        { status: 500 }
      );
    }
    
    console.log('[MD Import] 문제 생성 성공:', questions.length);
    
    // 6. 시험-문제 연결
    // order_index → order_num, points 필수
    const examQuestionInserts = dbData.questions.map((q, idx) => ({
      exam_id: exam.id,
      question_id: questions[idx].id,
      order_num: q.questionNumber,  // order_index → order_num
      points: q.points || 2,        // points 필수 (NOT NULL)
    }));
    
    console.log('[MD Import] exam_questions 샘플:', examQuestionInserts[0]);
    
    const { error: linkError } = await supabase
      .from('exam_questions')
      .insert(examQuestionInserts);
    
    if (linkError) {
      console.error('[MD Import] 시험-문제 연결 실패:', linkError);
      await supabase.from('questions').delete().in('id', questions.map(q => q.id));
      await supabase.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { error: '시험-문제 연결 실패', details: linkError.message },
        { status: 500 }
      );
    }
    
    console.log('[MD Import] 완료!');
    
    return NextResponse.json({
      success: true,
      examId: exam.id,
      title: exam.title,
      questionCount: questions.length,
      totalPoints: dbData.examData.totalPoints,
    });
    
  } catch (error) {
    console.error('[MD Import] 전체 오류:', error);
    return NextResponse.json(
      { error: '시험 생성 실패', details: String(error) },
      { status: 500 }
    );
  }
}
