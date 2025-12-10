/**
 * GET /api/admin/classes/[classId]/available-students
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { classId, academyId } = req.query;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (!academyId || typeof academyId !== 'string') {
    return res.status(400).json({ success: false, error: 'academyId가 필요합니다' });
  }

  try {
    const supabase = createClient();

    // 1. 이 반에 이미 등록된 학생 ID 목록
    const { data: existingEnrollments } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('is_active', true);

    const existingStudentIds = (existingEnrollments || []).map(e => e.student_id);

    // 2. 학원의 모든 학생 중 이 반에 없는 학생들
    let query = supabase
      .from('users')
      .select('id, name, email')
      .eq('academy_id', academyId)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('name', { ascending: true });

    // 이미 등록된 학생 제외
    if (existingStudentIds.length > 0) {
      query = query.not('id', 'in', `(${existingStudentIds.join(',')})`);
    }

    const { data: students, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: '학생 목록 조회 실패' });
    }

    return res.status(200).json({
      success: true,
      students: students || [],
    });

  } catch (error: any) {
    console.error('[Available Students] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
