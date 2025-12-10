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
    const { academyId } = req.query;

    // 1. 반 개수
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 2. 학생 수
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    // 3. 미제출/진행 중 배정 수 (pending)
    const { count: pendingCount } = await supabase
      .from('exam_assignments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['scheduled', 'ongoing']);

    // 4. 최근 시험 목록 (상세 정보 포함)
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, created_at, total_points')
      .order('created_at', { ascending: false })
      .limit(5);

    // 5. 각 시험별 배정/완료 현황
    const recentExams = await Promise.all(
      (exams || []).map(async (exam: any) => {
        // 배정 현황
        const { data: assignments } = await supabase
          .from('exam_assignments')
          .select('id, status')
          .eq('exam_id', exam.id);

        const totalStudents = assignments?.length || 0;
        const completedCount = assignments?.filter((a: any) => a.status === 'completed').length || 0;

        // 평균 점수
        const { data: submissions } = await supabase
          .from('submissions')
          .select('score')
          .eq('assignment_id', assignments?.map((a: any) => a.id) || []);

        const scores = (submissions || []).map((s: any) => s.score).filter((s: any) => s !== null);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

        return {
          id: exam.id,
          title: exam.title,
          className: '',  // 시험은 반과 직접 연결 안 됨
          status: completedCount === totalStudents && totalStudents > 0 ? 'completed' : 'ongoing',
          averageScore,
          completedCount,
          totalStudents,
        };
      })
    );

    return res.status(200).json({
      success: true,
      stats: {
        classCount: classCount || 0,
        studentCount: studentCount || 0,
        pendingCount: pendingCount || 0,
      },
      recentExams,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
