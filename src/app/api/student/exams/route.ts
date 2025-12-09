/**
 * GET /api/student/exams
 * 
 * 학생에게 배정된 시험 목록 조회
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 배정된 시험 목록 조회
    const { data: assignments, error: assignError } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        exam_id,
        status,
        start_time,
        end_time,
        created_at
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (assignError) {
      console.error('[Student Exams] 배정 조회 오류:', assignError);
      return NextResponse.json(
        { success: false, error: '시험 목록 조회 실패' },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: true,
        exams: [],
        count: 0,
      });
    }

    // 각 배정에 대해 시험 정보 조회
    const exams = [];
    for (const assignment of assignments) {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          description,
          total_points,
          time_limit_minutes,
          passing_score,
          instructions,
          allow_retry,
          shuffle_questions,
          show_answer_after
        `)
        .eq('id', assignment.exam_id)
        .single();

      if (examError || !exam) continue;

      // 문제 수 조회
      const { count: questionCount } = await supabase
        .from('exam_questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', assignment.exam_id);

      // 제출 정보 조회
      const { data: submission } = await supabase
        .from('submissions')
        .select('id, score, submitted_at')
        .eq('assignment_id', assignment.id)
        .eq('assignment_type', 'exam')
        .single();

      exams.push({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        duration: exam.time_limit_minutes,
        timeLimitMinutes: exam.time_limit_minutes,
        passingScore: exam.passing_score,
        questionCount: questionCount || 0,
        
        assignmentId: assignment.id,
        status: assignment.status,
        startTime: assignment.start_time,
        endTime: assignment.end_time,
        assignedAt: assignment.created_at,
        
        submissionId: submission?.id || null,
        score: submission?.score || null,
        completedAt: submission?.submitted_at || null,
        
        isExpired: new Date(assignment.end_time) < new Date(),
        canStart: assignment.status === ASSIGNMENT_STATUS.SCHEDULED && 
                  new Date(assignment.end_time) > new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      exams,
      count: exams.length,
    });
  } catch (error) {
    console.error('[Student Exams] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
