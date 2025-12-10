/**
 * POST /api/admin/exams/[examId]/assign
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId } = req.query;
  const { classId } = req.body || {};

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  try {
    const supabase = createClient();

    // 1. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, academy_id, title, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 2. 학생 목록 조회
    let students: Array<{ id: string }> = [];

    if (classId) {
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('is_active', true);

      if (enrollError) {
        return res.status(500).json({ success: false, error: '학생 목록 조회 실패' });
      }

      students = (enrollments || []).map(e => ({ id: e.student_id }));
    } else {
      const { data: allStudents, error: studentsError } = await supabase
        .from('users')
        .select('id')
        .eq('academy_id', exam.academy_id)
        .eq('role', 'student')
        .eq('is_active', true);

      if (studentsError) {
        return res.status(500).json({ success: false, error: '학생 목록 조회 실패' });
      }

      students = allStudents || [];
    }

    if (students.length === 0) {
      return res.status(400).json({ success: false, error: '배정할 학생이 없습니다' });
    }

    // 3. 이미 배정된 학생 확인
    const { data: existingAssignments } = await supabase
      .from('exam_assignments')
      .select('student_id')
      .eq('exam_id', examId);

    const existingStudentIds = new Set(
      (existingAssignments || []).map(a => a.student_id)
    );

    const newStudents = students.filter(s => !existingStudentIds.has(s.id));

    if (newStudents.length === 0) {
      return res.status(200).json({
        success: true,
        assignedCount: 0,
        message: '이미 모든 학생에게 배정되어 있습니다',
      });
    }

    // 4. 시험 시간 설정
    const now = new Date();
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 5. 배정 생성
    const assignments = newStudents.map((student) => ({
      exam_id: examId,
      student_id: student.id,
      status: 'scheduled',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
    }));

    const { data: insertedAssignments, error: assignError } = await supabase
      .from('exam_assignments')
      .insert(assignments)
      .select();

    if (assignError) {
      return res.status(500).json({ success: false, error: '배정 생성 실패', details: assignError.message });
    }

    return res.status(200).json({
      success: true,
      assignedCount: insertedAssignments?.length || newStudents.length,
      message: `${insertedAssignments?.length || newStudents.length}명의 학생에게 배정되었습니다`,
    });

  } catch (error: any) {
    console.error('[Assign] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
