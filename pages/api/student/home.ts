// pages/api/student/home.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { studentId } = req.query;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ success: false, error: 'studentId 필요' });
    }

    // 1. 학생 정보 (반 이름 가져오기)
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select(`
        class:classes(id, name)
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .limit(1);

    const firstEnrollment = enrollments?.[0] as any;
    const className = firstEnrollment?.class?.name || '';

    // 2. 배정된 시험 조회 (진행 전/진행 중)
    const { data: examAssignments } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        updated_at,
        exam:exams(id, title, time_limit_minutes, total_points)
      `)
      .eq('student_id', studentId)
      .in('status', ['scheduled', 'ongoing'])
      .order('end_time', { ascending: true })
      .limit(5);

    // 3. 오답노트 개수 (submission_answers에서 is_correct = false)
    const { data: wrongAnswers } = await supabase
      .from('submission_answers')
      .select(`
        id,
        submission:submissions!inner(student_id)
      `)
      .eq('is_correct', false)
      .eq('submissions.student_id', studentId);

    const totalWrong = wrongAnswers?.length || 0;

    // 4. 오늘의 할 일 포맷팅
    const now = new Date();
    const todayExams = (examAssignments || [])
      .filter((a: any) => new Date(a.end_time) >= now)
      .map((a: any) => ({
        id: a.exam?.id,
        assignmentId: a.id,
        title: a.exam?.title || '시험',
        className: className,
        duration: a.exam?.time_limit_minutes || 60,
        totalPoints: a.exam?.total_points || 0,
        scheduledAt: a.start_time,
        dueAt: a.end_time,
        status: a.status,
        isStarted: a.status === 'ongoing',
        startedAt: a.status === 'ongoing' ? a.updated_at : null,
      }));

    // 프론트엔드 형식에 맞게 직접 반환 (data 래퍼 없이)
    return res.status(200).json({
      success: true,
      todayExams,
      todayHomeworks: [],
      reviewStats: {
        totalWrong,
        reviewedToday: 0,
        todayLimit: 10,
      },
    });
  } catch (err) {
    console.error('Student home error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
