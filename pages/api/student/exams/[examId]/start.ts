// pages/api/student/exams/[examId]/start.ts
// 학생 시험 시작
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId } = req.query;
  const { studentId } = req.body;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId required' });
  }

  try {
    // 1. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status, start_time, end_time')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      console.error('Assignment fetch error:', assignError);
      return res.status(403).json({ success: false, error: '시험 권한이 없습니다' });
    }

    // 이미 완료된 경우
    if (assignment.status === 'completed') {
      return res.status(400).json({ success: false, error: '이미 완료한 시험입니다' });
    }

    // 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return res.status(403).json({ success: false, error: '시험 기간이 종료되었습니다' });
    }

    // 2. 상태 업데이트 (ongoing) - started_at 컬럼 없이
    const { error: updateError } = await supabase
      .from('exam_assignments')
      .update({ 
        status: 'ongoing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id);

    if (updateError) {
      console.error('Assignment update error:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: '시험이 시작되었습니다',
      assignmentId: assignment.id,
    });
  } catch (err) {
    console.error('Start exam error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
