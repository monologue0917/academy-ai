// pages/api/admin/classes/[classId]/available-students.ts
// 반에 추가 가능한 학생 목록 조회
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

  const { classId, academyId } = req.query;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (typeof academyId !== 'string') {
    return res.status(400).json({ success: false, error: 'academyId required' });
  }

  try {
    // 1. 현재 반에 이미 등록된 학생 ID 목록
    const { data: enrolled } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('is_active', true);

    const enrolledIds = (enrolled || []).map((e) => e.student_id);

    // 2. 학원 소속 학생 중 이 반에 등록되지 않은 학생
    let query = supabase
      .from('users')
      .select('id, name, email')
      .eq('academy_id', academyId)
      .eq('role', 'student')
      .eq('is_active', true);

    // 이미 등록된 학생 제외
    if (enrolledIds.length > 0) {
      query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
    }

    const { data: students, error } = await query.order('name');

    if (error) {
      console.error('Available students error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      students: students || [],
    });
  } catch (err) {
    console.error('Available students error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
