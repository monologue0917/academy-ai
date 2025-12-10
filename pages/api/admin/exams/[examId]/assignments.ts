// pages/api/admin/exams/[examId]/assignments.ts
// 개별 배정 삭제 (관련 데이터 모두 정리)
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
    // 1. 해당 배정 확인
    const { data: assignment, error: fetchError } = await supabase
      .from('exam_assignments')
      .select('id, student_id, status')
      .eq('id', assignmentId)
      .eq('exam_id', examId)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({ success: false, error: '배정을 찾을 수 없습니다' });
    }

    // 2. 관련 submissions 조회
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('assignment_id', assignmentId);

    const submissionIds = (submissions || []).map(s => s.id);

    // 3. submission_answers 삭제 (먼저!)
    if (submissionIds.length > 0) {
      const { error: answersError } = await supabase
        .from('submission_answers')
        .delete()
        .in('submission_id', submissionIds);

      if (answersError) {
        console.error('Delete submission_answers error:', answersError);
      }
    }

    // 4. submissions 삭제
    if (submissionIds.length > 0) {
      const { error: subError } = await supabase
        .from('submissions')
        .delete()
        .eq('assignment_id', assignmentId);

      if (subError) {
        console.error('Delete submissions error:', subError);
      }
    }

    // 5. exam_assignment 삭제
    const { error: deleteError } = await supabase
      .from('exam_assignments')
      .delete()
      .eq('id', assignmentId);

    if (deleteError) {
      console.error('Delete assignment error:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    console.log(`[Assignments] Deleted: assignment=${assignmentId}, submissions=${submissionIds.length}`);

    return res.status(200).json({ 
      success: true, 
      message: '배정이 삭제되었습니다',
      deleted: {
        assignment: 1,
        submissions: submissionIds.length,
      }
    });
  } catch (err) {
    console.error('Delete assignment error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
