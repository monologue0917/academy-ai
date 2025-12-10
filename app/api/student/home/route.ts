/**
 * GET /api/student/home
 * 
 * 학생 홈 화면 데이터 API
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  ASSIGNMENT_STATUS,
  type StudentHomeResponse,
  type TodayExam,
} from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. 배정된 시험 목록 (scheduled, ongoing)
    const { data: examAssignments, error: examError } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        exam:exams(
          id,
          title,
          time_limit_minutes,
          total_points
        )
      `)
      .eq('student_id', studentId)
      .in('status', [ASSIGNMENT_STATUS.SCHEDULED, ASSIGNMENT_STATUS.ONGOING]);

    if (examError) {
      console.error('[Home API] Exam error:', examError);
    }

    // 2. 오답노트 통계
    const { count: wrongNoteCount } = await supabase
      .from('wrong_notes')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    // 시험 데이터 가공
    const todayExams: TodayExam[] = await Promise.all(
      (examAssignments || [])
        .filter(a => a.exam)
        .map(async (a) => {
          // exam 데이터 안전하게 추출
          const examData = a.exam as any;
          const exam = Array.isArray(examData)
            ? examData[0]
            : examData;
          
          // 문제 수 조회
          const { count: questionCount } = await supabase
            .from('exam_questions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam?.id);
          
          return {
            id: exam?.id || '',
            assignmentId: a.id,
            title: exam?.title || '',
            className: '수능반',
            duration: exam?.time_limit_minutes || 70,
            totalPoints: exam?.total_points || 0,
            totalQuestions: questionCount || 0,
            scheduledAt: a.start_time,
            dueAt: a.end_time,
            status: a.status as TodayExam['status'],
            isStarted: a.status === ASSIGNMENT_STATUS.ONGOING,
            startedAt: a.start_time,
          };
        })
    );
    
    todayExams.sort((a, b) => {
      if (a.isStarted && !b.isStarted) return -1;
      if (!a.isStarted && b.isStarted) return 1;
      return new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime();
    });

    const response: StudentHomeResponse = {
      success: true,
      todayExams,
      todayHomeworks: [],
      reviewStats: {
        totalWrong: wrongNoteCount || 0,
        reviewedToday: 0,
        todayLimit: 10,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Home API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
