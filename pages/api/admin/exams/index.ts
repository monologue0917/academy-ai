// pages/api/admin/exams/index.ts
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
    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        description,
        duration,
        time_limit_minutes,
        total_points,
        created_at,
        teacher:users!exams_created_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // 각 시험의 문제 수와 배정 수 조회
    const examsWithStats = await Promise.all(
      (exams || []).map(async (exam: any) => {
        const { count: questionCount } = await supabase
          .from('exam_questions')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        const { count: assignmentCount } = await supabase
          .from('exam_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        return {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration: exam.duration || exam.time_limit_minutes,
          totalPoints: exam.total_points,
          createdAt: exam.created_at,
          teacher: exam.teacher,
          questionCount: questionCount || 0,
          assignmentCount: assignmentCount || 0,
          status: 'published',
        };
      })
    );

    return res.status(200).json({ success: true, exams: examsWithStats });
  } catch (err) {
    console.error('Exams GET error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
