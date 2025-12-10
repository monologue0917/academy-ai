// pages/api/student/exams/index.ts
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

    const { data: assignments, error } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        exam:exams(
          id,
          title,
          description,
          time_limit_minutes,
          total_points
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const exams = (assignments || []).map((a: any) => ({
      assignmentId: a.id,
      status: a.status,
      startTime: a.start_time,
      endTime: a.end_time,
      exam: a.exam ? {
        id: a.exam.id,
        title: a.exam.title,
        description: a.exam.description,
        duration: a.exam.time_limit_minutes,
        totalPoints: a.exam.total_points,
      } : null,
    }));

    return res.status(200).json({ success: true, exams });
  } catch (err) {
    console.error('Student exams error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
