/**
 * GET /api/admin/dashboard
 * 
 * 선생님 대시보드 통계 API
 * 
 * 응답:
 * - stats: 전체 반 수, 학생 수, 미채점 과제 수
 * - recentExams: 최근 시험 목록 (최대 5개)
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 1. 전체 반 수 조회
    const { count: classCount, error: classError } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academyId)
      .eq('is_active', true);

    // 2. 전체 학생 수 조회
    const { count: studentCount, error: studentError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academyId)
      .eq('role', 'student')
      .eq('is_active', true);

    // 3. 미채점 과제 수 (submitted 상태인 것)
    const { count: pendingCount, error: pendingError } = await supabase
      .from('submissions')
      .select('*, exam:exams!inner(academy_id)', { count: 'exact', head: true })
      .eq('exam.academy_id', academyId)
      .eq('status', 'submitted');

    // 4. 최근 시험 목록 (최대 5개)
    const { data: recentExams, error: examsError } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        status,
        scheduled_at,
        due_at,
        duration,
        total_points,
        class:classes(id, name)
      `)
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 5. 각 시험별 통계 계산
    const examsWithStats = await Promise.all(
      (recentExams || []).map(async (exam) => {
        // 배정된 학생 수
        const { count: totalAssigned } = await supabase
          .from('exam_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        // 제출 완료 수
        const { count: completedCount } = await supabase
          .from('exam_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .in('status', ['submitted', 'graded']);

        // 평균 점수
        const { data: submissions } = await supabase
          .from('submissions')
          .select('score, percentage')
          .eq('exam_id', exam.id)
          .not('score', 'is', null);

        const scores = submissions?.map(s => s.score) || [];
        const averageScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

        // class 속성 안전하게 처리
        const classData = exam.class as any;
        const className = Array.isArray(classData) 
          ? (classData[0]?.name || '미지정')
          : (classData?.name || '미지정');

        return {
          id: exam.id,
          title: exam.title,
          className,
          status: exam.status,
          scheduledAt: exam.scheduled_at,
          dueAt: exam.due_at,
          averageScore: Number(averageScore.toFixed(1)),
          completedCount: completedCount || 0,
          totalStudents: totalAssigned || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      stats: {
        classCount: classCount || 0,
        studentCount: studentCount || 0,
        pendingCount: pendingCount || 0,
      },
      recentExams: examsWithStats,
    });

  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
