// pages/api/admin/classes/[classId]/remove-student.ts
// 반에서 학생 제거
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

  const { classId } = req.query;
  const { enrollmentId } = req.body;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (!enrollmentId) {
    return res.status(400).json({ success: false, error: 'enrollmentId required' });
  }

  try {
    // 소프트 삭제 (is_active = false)
    const { error } = await supabase
      .from('class_enrollments')
      .update({ is_active: false })
      .eq('id', enrollmentId)
      .eq('class_id', classId);

    if (error) {
      console.error('Remove student error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, message: '학생이 반에서 제거되었습니다' });
  } catch (err) {
    console.error('Remove student error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
