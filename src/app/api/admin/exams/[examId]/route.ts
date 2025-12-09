/**
 * GET /api/admin/exams/[examId]
 * DELETE /api/admin/exams/[examId]
 * 
 * 기능: 시험 상세 정보 + 문제 목록 + 배정 현황 조회 / 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 동적 라우트 강제 (모든 import 후에 위치)
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const examId = params.examId;
    const supabase = createClient();

    console.log('[ExamDetail] examId:', examId);

    if (!examId) {
      return NextResponse.json(
        { success: false, error: 'examId가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 시험 기본 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        academy_id,
        teacher_id,
        title,
        description,
        total_points,
        time_limit_minutes,
        passing_score,
        instructions,
        settings,
        allow_retry,
        shuffle_questions,
        show_answer_after,
        created_at,
        updated_at
      `)
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('[ExamDetail] 시험 조회 실패:', examError);
      return NextResponse.json(
        { success: false, error: '시험을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 선생님 정보 별도 조회
    let teacher = null;
    if (exam.teacher_id) {
      const { data: teacherData } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', exam.teacher_id)
        .single();
      teacher = teacherData;
    }

    // 3. 문제 목록 조회
    const { data: examQuestions, error: questionsError } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_num,
        points,
        question:questions(
          id,
          type,
          content,
          choices,
          correct_answer,
          explanation,
          difficulty_level,
          metadata
        )
      `)
      .eq('exam_id', examId)
      .order('order_num', { ascending: true });

    if (questionsError) {
      console.error('[ExamDetail] 문제 조회 실패:', questionsError);
    }

    // 4. 배정 현황 조회
    const { data: assignData, error: assignError } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        student_id,
        class_id,
        status,
        start_time,
        end_time,
        created_at
      `)
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });

    if (assignError) {
      console.error('[ExamDetail] 배정 조회 실패:', assignError);
    }

    // 학생 정보 조회
    const assignments = [];
    if (assignData && assignData.length > 0) {
      for (const a of assignData) {
        const { data: studentData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', a.student_id)
          .single();

        // 반 정보 조회
        let className = null;
        if (a.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', a.class_id)
            .single();
          className = classData?.name;
        }

        assignments.push({
          id: a.id,
          studentId: a.student_id,
          student: studentData,
          className: className,
          status: a.status,
          startTime: a.start_time,
          endTime: a.end_time,
          createdAt: a.created_at,
        });
      }
    }

    // 5. 통계 계산
    const totalAssignments = assignments.length;
    const completedCount = assignments.filter(
      (a) => a.status === 'completed'
    ).length;

    // 6. 응답 구성
    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        academyId: exam.academy_id,
        teacherId: exam.teacher_id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        duration: exam.time_limit_minutes,
        timeLimitMinutes: exam.time_limit_minutes,
        passingScore: exam.passing_score,
        instructions: exam.instructions,
        settings: exam.settings,
        allowRetry: exam.allow_retry,
        shuffleQuestions: exam.shuffle_questions,
        showAnswerAfter: exam.show_answer_after,
        createdAt: exam.created_at,
        updatedAt: exam.updated_at,
        teacher: teacher,
        status: 'published',
        className: '전체',
      },
      questions: examQuestions?.map((eq) => {
        const questionData = eq.question as unknown;
        const q = (Array.isArray(questionData) ? questionData[0] : questionData) as Record<string, unknown> | null;
        
        // choices를 문자열 배열로 정규화
        let normalizedChoices: string[] = [];
        const choices = q?.choices;
        if (choices) {
          if (Array.isArray(choices)) {
            normalizedChoices = choices.map((c: unknown) => {
              if (typeof c === 'string') return c;
              if (typeof c === 'object' && c !== null) {
                const obj = c as Record<string, unknown>;
                return String(obj.text || obj.label || obj.content || obj.value || JSON.stringify(c));
              }
              return String(c);
            });
          } else if (typeof choices === 'object') {
            normalizedChoices = Object.values(choices).map((v) => String(v));
          }
        }
        
        return {
          id: String(q?.id || ''),
          type: String(q?.type || 'multiple_choice'),
          content: String(q?.content || ''),
          choices: normalizedChoices,
          correctAnswer: String(q?.correct_answer || ''),
          explanation: q?.explanation ? String(q.explanation) : null,
          difficultyLevel: Number(q?.difficulty_level) || 1,
          metadata: (q?.metadata as Record<string, unknown>) || {},
          orderNum: eq.order_num,
          points: eq.points || 2,
        };
      }) || [],
      assignments: assignments,
      stats: {
        totalAssignments,
        completedCount,
        submissionRate: totalAssignments > 0
          ? ((completedCount / totalAssignments) * 100).toFixed(1)
          : '0.0',
        questionCount: examQuestions?.length || 0,
      },
    });
  } catch (error: unknown) {
    console.error('[ExamDetail] 전체 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const examId = params.examId;
    const supabase = createClient();

    // 1. exam_questions 삭제
    await supabase
      .from('exam_questions')
      .delete()
      .eq('exam_id', examId);

    // 2. exam_assignments 삭제
    await supabase
      .from('exam_assignments')
      .delete()
      .eq('exam_id', examId);

    // 3. 시험 삭제
    const { error: examError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (examError) {
      console.error('시험 삭제 오류:', examError);
      return NextResponse.json(
        { success: false, error: '시험 삭제 실패', details: examError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '시험이 삭제되었습니다',
    });
  } catch (error: unknown) {
    console.error('시험 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
