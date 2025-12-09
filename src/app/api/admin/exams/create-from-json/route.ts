/**
 * POST /api/admin/exams/create-from-json
 * 
 * PDF/이미지 파싱 결과(JSON)로 시험 생성
 * 
 * Body:
 * {
 *   examInfo: {
 *     title: string;
 *     classId: string;
 *     scheduledAt: string;
 *     durationMinutes: number;
 *   },
 *   questions: Array<{
 *     questionNumber: number;
 *     type: 'mcq' | 'short_answer' | 'essay';
 *     content: string;
 *     passage?: string;
 *     choices?: string[];
 *     correctAnswer: string;
 *     points?: number;
 *   }>
 * }
 * 
 * 처리:
 * 1. exams 테이블에 시험 생성
 * 2. questions 테이블에 문제들 생성
 * 3. exam_questions 테이블에 매핑 생성
 * 4. (선택) exam_assignments 테이블에 학생 배정
 * 
 * 응답:
 * - success: true
 * - examId: 생성된 시험 ID
 * - questionCount: 생성된 문제 수
 * - totalPoints: 총점
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 (Service Role Key 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// Types
// ============================================

interface ExamInfo {
  title: string;
  classId: string;
  scheduledAt: string;
  durationMinutes: number;
  description?: string;
}

interface QuestionInput {
  questionNumber: number;
  type: 'mcq' | 'short_answer' | 'essay';
  content: string;
  passage?: string;
  choices?: string[];
  correctAnswer: string;
  points?: number;
}

interface CreateFromJsonRequest {
  examInfo: ExamInfo;
  questions: QuestionInput[];
  autoAssign?: boolean; // 자동으로 반 학생에게 배정할지
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: CreateFromJsonRequest = await request.json();
    const { examInfo, questions, autoAssign = false } = body;

    // ----------------------------------------
    // 1. Validation
    // ----------------------------------------
    if (!examInfo || !examInfo.title || !examInfo.classId) {
      return NextResponse.json(
        { success: false, error: '시험 정보가 불완전합니다 (title, classId 필수)' },
        { status: 400 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '문제가 없습니다' },
        { status: 400 }
      );
    }

    // 문제 번호 중복 체크
    const questionNumbers = questions.map(q => q.questionNumber);
    const duplicates = questionNumbers.filter(
      (num, idx) => questionNumbers.indexOf(num) !== idx
    );
    if (duplicates.length > 0) {
      return NextResponse.json(
        { success: false, error: `중복된 문제 번호: ${duplicates.join(', ')}` },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // 2. 기본값 설정
    // ----------------------------------------
    // TODO: 실제로는 세션에서 academy_id, teacher_id 가져오기
    // Seed 데이터와 일치시킴
    const academyId = 'a0000000-0000-0000-0000-000000000001';
    const teacherId = 'u0000000-0000-0000-0000-000000000001';

    // 총점 계산
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    // Due date 계산 (시작 시간 + 제한 시간)
    const scheduledAt = new Date(examInfo.scheduledAt);
    const dueAt = new Date(
      scheduledAt.getTime() + (examInfo.durationMinutes || 60) * 60 * 1000
    );

    // ----------------------------------------
    // 3. Exam 생성
    // ----------------------------------------
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        academy_id: academyId,
        class_id: examInfo.classId,
        created_by: teacherId,
        title: examInfo.title,
        description: examInfo.description || null,
        duration: examInfo.durationMinutes || 60,
        total_points: totalPoints,
        pass_score: null,
        scheduled_at: scheduledAt.toISOString(),
        due_at: dueAt.toISOString(),
        shuffle_questions: false,
        show_answer_after: true,
        allow_retry: false,
        status: 'draft',
      })
      .select()
      .single();

    if (examError || !exam) {
      console.error('Exam insert error:', examError);
      return NextResponse.json(
        { success: false, error: '시험 생성 실패', details: examError?.message },
        { status: 500 }
      );
    }

    console.log(`✅ Exam created: ${exam.id}`);

    // ----------------------------------------
    // 4. Questions 생성
    // ----------------------------------------
    const questionInserts = questions.map((q) => ({
      academy_id: academyId,
      created_by: teacherId,
      type: q.type,
      content: q.content,
      passage: q.passage || null,
      options: q.choices || null,
      correct_answer: q.correctAnswer,
      explanation: null,
      points: q.points || 1,
      category: null,
      difficulty: null,
      tags: [],
      source: 'PDF/Image Import',
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
        { success: false, error: '문제 생성 실패', details: questionsError?.message },
        { status: 500 }
      );
    }

    console.log(`✅ Questions created: ${createdQuestions.length}개`);

    // ----------------------------------------
    // 5. Exam-Questions 매핑 생성
    // ----------------------------------------
    const examQuestionInserts = questions.map((q, idx) => ({
      exam_id: exam.id,
      question_id: createdQuestions[idx].id,
      order_index: q.questionNumber,
      points_override: q.points || null,
    }));

    const { error: examQuestionsError } = await supabase
      .from('exam_questions')
      .insert(examQuestionInserts);

    if (examQuestionsError) {
      console.error('ExamQuestions insert error:', examQuestionsError);
      // 롤백
      await supabase
        .from('questions')
        .delete()
        .in('id', createdQuestions.map((q) => q.id));
      await supabase.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { success: false, error: '시험-문제 연결 실패', details: examQuestionsError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Exam-Questions linked: ${examQuestionInserts.length}개`);

    // ----------------------------------------
    // 6. (선택) 학생 자동 배정
    // ----------------------------------------
    let assignedCount = 0;

    if (autoAssign) {
      // 해당 반의 모든 학생 조회
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', examInfo.classId)
        .eq('is_active', true);

      if (!enrollError && enrollments && enrollments.length > 0) {
        const assignments = enrollments.map((e) => ({
          exam_id: exam.id,
          student_id: e.student_id,
          assigned_at: new Date().toISOString(),
          status: 'pending',
        }));

        const { data: insertedAssignments, error: assignError } = await supabase
          .from('exam_assignments')
          .insert(assignments)
          .select();

        if (!assignError && insertedAssignments) {
          assignedCount = insertedAssignments.length;
          console.log(`✅ Students assigned: ${assignedCount}명`);
        }
      }
    }

    // ----------------------------------------
    // 7. 성공 응답
    // ----------------------------------------
    return NextResponse.json({
      success: true,
      examId: exam.id,
      questionCount: createdQuestions.length,
      totalPoints,
      assignedCount,
      message: `시험이 생성되었습니다. (${createdQuestions.length}문제, ${totalPoints}점)`,
    });

  } catch (error: any) {
    console.error('Unexpected error in create-from-json:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    );
  }
}
