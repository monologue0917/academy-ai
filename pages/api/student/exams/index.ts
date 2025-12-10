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

    // 1. 배정된 시험 조회
    const { data: assignments, error } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        created_at,
        exam:exams(
          id,
          title,
          description,
          time_limit_minutes,
          total_points,
          passing_score
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. 제출 정보 조회
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, exam_id, score, completed_at')
      .eq('student_id', studentId);

    // 제출 정보 맵
    const submissionMap = new Map();
    (submissions || []).forEach((s: any) => {
      submissionMap.set(s.exam_id, s);
    });

    // 3. 문제 수 조회
    const examIds = (assignments || [])
      .map((a: any) => a.exam?.id)
      .filter(Boolean);

    let questionCountMap = new Map();
    if (examIds.length > 0) {
      const { data: questionCounts } = await supabase
        .from('exam_questions')
        .select('exam_id')
        .in('exam_id', examIds);

      // 각 시험별 문제 수 계산
      (questionCounts || []).forEach((q: any) => {
        const count = questionCountMap.get(q.exam_id) || 0;
        questionCountMap.set(q.exam_id, count + 1);
      });
    }

    // 4. 프론트엔드 형식으로 변환
    const now = new Date();
    const exams = (assignments || []).map((a: any) => {
      const examId = a.exam?.id;
      const submission = submissionMap.get(examId);
      const endTime = new Date(a.end_time);
      const isExpired = endTime < now;

      return {
        // 시험 정보 (플랫하게)
        id: examId,
        title: a.exam?.title || '시험',
        description: a.exam?.description || null,
        totalPoints: a.exam?.total_points || 0,
        duration: a.exam?.time_limit_minutes || 60,
        timeLimitMinutes: a.exam?.time_limit_minutes || 60,
        passingScore: a.exam?.passing_score || null,
        questionCount: questionCountMap.get(examId) || 0,
        
        // 배정 정보
        assignmentId: a.id,
        status: a.status,
        startTime: a.start_time,
        endTime: a.end_time,
        assignedAt: a.created_at,
        
        // 제출 정보
        submissionId: submission?.id || null,
        score: submission?.score || null,
        completedAt: submission?.completed_at || null,
        
        // 상태 판단
        isExpired,
        canStart: !isExpired && a.status === 'scheduled',
      };
    });

    return res.status(200).json({ 
      success: true, 
      exams,
      count: exams.length,
    });
  } catch (err) {
    console.error('Student exams error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
