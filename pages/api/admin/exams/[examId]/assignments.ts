// pages/api/admin/exams/[examId]/assignments.ts
// 개별 배정 삭제
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
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId, assignmentId } = req.query;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (typeof assignmentId !== 'string') {
    return res.status(400).json({ success: false, error: 'assignmentId required' });
  }

  try {
    // 1. 해당 배정이 이 시험의 것인지 확인
    const { data: assignment, error: fetchError } = await supabase
      .from('exam_assignments')
      .select('id, status')
      .eq('id', assignmentId)
      .eq('exam_id', examId)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({ success: false, error: '배정을 찾을 수 없습니다' });
    }

    // 이미 완료된 시험은 삭제 불가 (선택적)
    // if (assignment.status === 'completed') {
    //   return res.status(400).json({ success: false, error: '완료된 시험 배정은 삭제할 수 없습니다' });
    // }

    // 2. 관련 submission_answers 삭제
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', assignment.id); // student_id와 assignment 연결 필요

    // 3. 배정 삭제
    const { error: deleteError } = await supabase
      .from('exam_assignments')
      .delete()
      .eq('id', assignmentId);

    if (deleteError) {
      console.error('Delete assignment error:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    return res.status(200).json({ success: true, message: '배정이 삭제되었습니다' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
