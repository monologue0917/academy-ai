/**
 * GET /api/admin/exams
 * POST /api/admin/exams
 * 
 * 선생님용 시험 목록 조회 / 생성 API
 * 
 * 실제 DB 스키마 (exams 테이블):
 * - id, academy_id, teacher_id, title, description
 * - total_points, time_limit_minutes, passing_score
 * - instructions, settings, created_at, updated_at
 * - allow_retry, shuffle_questions, show_answer_after
 * 
 * 없는 컬럼: status, scheduled_at, due_at, duration, class_id, created_by
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 시험 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const teacherId = searchParams.get('teacherId');

    if (!academyId) {
      return NextResponse.json(
        { success: false, error: 'academyId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 시험 목록 조회 (실제 DB 스키마에 맞춤)
    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        id,
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
        updated_at,
        teacher_id
      `)
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Exams fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 각 시험별 문제 수 및 통계 추가
    const examsWithStats = await Promise.all(
      (exams || []).map(async (exam) => {
        // 문제 수 조회
        const { count: questionCount } = await supabase
          .from('exam_questions')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        // 배정된 학생 수 (exam_assignments 테이블이 있다면)
        let totalAssigned = 0;
        let completedCount = 0;
        
        try {
          const { count: assigned } = await supabase
            .from('exam_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id);
          totalAssigned = assigned || 0;

          const { count: completed } = await supabase
            .from('exam_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id)
            .in('status', ['submitted', 'graded']);
          completedCount = completed || 0;
        } catch {
          // exam_assignments 테이블이 없을 수 있음
        }

        return {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          className: '전체', // class_id가 없으므로 기본값
          classId: null,
          status: 'published', // status 컬럼이 없으므로 기본값
          scheduledAt: null,
          dueAt: null,
          duration: exam.time_limit_minutes,
          totalPoints: exam.total_points,
          questionCount: questionCount || 0,
          completedCount: completedCount,
          totalStudents: totalAssigned,
          createdAt: exam.created_at,
          settings: exam.settings,
          allowRetry: exam.allow_retry,
          shuffleQuestions: exam.shuffle_questions,
          showAnswerAfter: exam.show_answer_after,
        };
      })
    );

    return NextResponse.json({
      success: true,
      exams: examsWithStats,
      count: examsWithStats.length,
    });

  } catch (error: unknown) {
    console.error('Exams API error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 시험 생성 (실제 DB 스키마에 맞춤)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      academyId, 
      teacherId, 
      title, 
      description, 
      timeLimitMinutes,
      passingScore,
      instructions,
      settings,
      allowRetry,
      shuffleQuestions,
      showAnswerAfter,
    } = body;

    if (!academyId || !teacherId || !title) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다 (academyId, teacherId, title)' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 시험 생성
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        academy_id: academyId,
        teacher_id: teacherId,
        title,
        description: description || null,
        time_limit_minutes: timeLimitMinutes || 60,
        passing_score: passingScore || null,
        instructions: instructions || null,
        settings: settings || {},
        allow_retry: allowRetry ?? false,
        shuffle_questions: shuffleQuestions ?? false,
        show_answer_after: showAnswerAfter ?? true,
        total_points: 0,
      })
      .select()
      .single();

    if (examError) {
      console.error('Exam creation error:', examError);
      return NextResponse.json(
        { success: false, error: '시험 생성 실패', details: examError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exam,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Exam POST error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
