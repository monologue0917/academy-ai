// pages/api/admin/classes/[classId]/add-student.ts
// 반에 학생 추가
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
  const { studentId } = req.body;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId required' });
  }

  try {
    // 이미 등록되어 있는지 확인
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id, is_active')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      if (existing.is_active) {
        return res.status(400).json({ success: false, error: '이미 등록된 학생입니다' });
      }
      
      // 비활성화된 등록이 있으면 다시 활성화
      const { error: updateError } = await supabase
        .from('class_enrollments')
        .update({ is_active: true, enrolled_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        return res.status(500).json({ success: false, error: updateError.message });
      }

      return res.status(200).json({ success: true, message: '학생이 다시 등록되었습니다' });
    }

    // 새로 등록
    const { data, error } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: studentId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Add student error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, enrollment: data });
  } catch (err) {
    console.error('Add student error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
