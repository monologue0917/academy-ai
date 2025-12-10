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

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];

    // 배정된 시험 조회
    const { data: examAssignments } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        exam:exams(id, title, duration, time_limit_minutes, total_points)
      `)
      .eq('student_id', studentId)
      .in('status', ['scheduled', 'ongoing'])
      .order('end_time', { ascending: true })
      .limit(5);

    // 오답노트 개수
    const { count: wrongNoteCount } = await supabase
      .from('wrong_notes')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_resolved', false);

    // 최근 완료한 시험
    const { data: recentResults } = await supabase
      .from('submissions')
      .select(`
        id,
        score,
        max_score,
        submitted_at,
        exam:exams(id, title)
      `)
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .order('submitted_at', { ascending: false })
      .limit(3);

    const todayExams = (examAssignments || [])
      .filter((a: any) => a.end_time?.startsWith(today))
      .map((a: any) => ({
        assignmentId: a.id,
        examId: a.exam?.id,
        title: a.exam?.title || '시험',
        duration: a.exam?.duration || a.exam?.time_limit_minutes || 60,
        status: a.status,
        endTime: a.end_time,
      }));

    return res.status(200).json({
      success: true,
      data: {
        todayExams,
        todayHomeworks: [],
        wrongNoteCount: wrongNoteCount || 0,
        recentResults: (recentResults || []).map((r: any) => ({
          examTitle: r.exam?.title || '시험',
          score: r.score,
          maxScore: r.max_score,
          submittedAt: r.submitted_at,
        })),
        weakAreas: [],
      },
    });
  } catch (err) {
    console.error('Student home error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
