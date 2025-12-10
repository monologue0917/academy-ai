// pages/api/admin/exams/[examId]/assign.ts
// 시험을 반에 배정
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
  const { classId, startTime, endTime } = req.body;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (!classId) {
    return res.status(400).json({ success: false, error: 'classId required' });
  }

  try {
    // 1. 반에 속한 학생들 조회
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('is_active', true);

    if (enrollError) {
      console.error('Enrollment fetch error:', enrollError);
      return res.status(500).json({ success: false, error: '학생 목록 조회 실패' });
    }

    if (!enrollments || enrollments.length === 0) {
      return res.status(400).json({ success: false, error: '반에 등록된 학생이 없습니다' });
    }

    // 2. 이미 배정된 학생 확인
    const { data: existingAssignments } = await supabase
      .from('exam_assignments')
      .select('student_id')
      .eq('exam_id', examId);

    const existingStudentIds = new Set((existingAssignments || []).map(a => a.student_id));

    // 3. 새로 배정할 학생들
    const newStudents = enrollments.filter(e => !existingStudentIds.has(e.student_id));

    if (newStudents.length === 0) {
      return res.status(400).json({ success: false, error: '모든 학생이 이미 배정되어 있습니다' });
    }

    // 4. 배정 생성
    const now = new Date();
    const defaultStartTime = startTime || now.toISOString();
    const defaultEndTime = endTime || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7일 후

    // class_id와 student_id 중 하나만 사용 (DB 제약조건)
    // 학생 단위 배정이므로 student_id만 사용
    const assignmentsToInsert = newStudents.map(e => ({
      exam_id: examId,
      student_id: e.student_id,
      status: 'scheduled',
      start_time: defaultStartTime,
      end_time: defaultEndTime,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('exam_assignments')
      .insert(assignmentsToInsert)
      .select();

    if (insertError) {
      console.error('Assignment insert error:', insertError);
      return res.status(500).json({ success: false, error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      message: `${newStudents.length}명의 학생에게 시험이 배정되었습니다`,
      assignedCount: newStudents.length,
      assignments: inserted,
    });
  } catch (err) {
    console.error('Assign error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
