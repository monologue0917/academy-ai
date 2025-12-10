// pages/api/admin/dashboard.ts
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
    const { academyId, teacherId } = req.query;

    // 반 개수
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 학생 수
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    // 시험 수
    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true });

    // 최근 시험 목록
    const { data: recentExams } = await supabase
      .from('exams')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return res.status(200).json({
      success: true,
      stats: {
        classCount: classCount || 0,
        studentCount: studentCount || 0,
        examCount: examCount || 0,
      },
      recentExams: recentExams || [],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
