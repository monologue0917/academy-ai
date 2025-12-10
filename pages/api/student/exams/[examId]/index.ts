// pages/api/student/exams/[examId]/index.ts
// 학생용 시험 기본 정보 조회
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
  const { examId } = req.query;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  // GET: 학생용 시험 정보 조회
  if (req.method === 'GET') {
    try {
      const { data: exam, error } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          description,
          time_limit_minutes,
          total_points,
          instructions
        `)
        .eq('id', examId)
        .single();

      if (error || !exam) {
        return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
      }

      return res.status(200).json({
        success: true,
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration: exam.time_limit_minutes,
          timeLimitMinutes: exam.time_limit_minutes,
          totalPoints: exam.total_points,
          instructions: exam.instructions,
        },
      });
    } catch (err) {
      console.error('Student exam GET error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
