/**
 * POST /api/student/exams/[examId]/start
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId, studentId: queryStudentId } = req.query;
  const { studentId: bodyStudentId } = req.body || {};
  const studentId = bodyStudentId || queryStudentId;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ success: false, error: '학생 ID가 필요합니다' });
  }

  try {
    const supabase = createClient();

    // 1. 시험 확인
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 2. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status, start_time, end_time')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return res.status(403).json({ success: false, error: '배정된 시험이 아닙니다' });
    }

    // 3. 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return res.status(403).json({ success: false, error: '시험 기간이 종료되었습니다' });
    }

    // 4. 상태 확인
    if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, error: '이미 제출한 시험입니다' });
    }

    if (assignment.status === ASSIGNMENT_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, error: '취소된 시험입니다' });
    }

    if (assignment.status === ASSIGNMENT_STATUS.ONGOING) {
      return res.status(200).json({
        success: true,
        assignmentId: assignment.id,
        message: '이미 시작된 시험입니다',
      });
    }

    // 5. ongoing으로 업데이트
    const { error: updateError } = await supabase
      .from('exam_assignments')
      .update({ status: ASSIGNMENT_STATUS.ONGOING })
      .eq('id', assignment.id);

    if (updateError) {
      return res.status(500).json({ success: false, error: '시험 시작 실패' });
    }

    return res.status(200).json({
      success: true,
      assignmentId: assignment.id,
      message: '시험이 시작되었습니다',
    });

  } catch (error: any) {
    console.error('[Exam Start] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
