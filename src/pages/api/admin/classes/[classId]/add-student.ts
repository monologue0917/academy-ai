/**
 * POST /api/admin/classes/[classId]/add-student
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

  const { classId } = req.query;
  const { studentId } = req.body;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId가 필요합니다' });
  }

  try {
    const supabase = createClient();

    // 1. 이미 등록되어 있는지 확인
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id, is_active')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      if (existing.is_active) {
        return res.status(400).json({ success: false, error: '이미 이 반에 등록된 학생입니다' });
      } else {
        // 비활성 상태면 다시 활성화
        const { error: updateError } = await supabase
          .from('class_enrollments')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          return res.status(500).json({ success: false, error: '학생 추가 실패' });
        }

        return res.status(200).json({ success: true });
      }
    }

    // 2. 새로 등록
    const { error: insertError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: studentId,
        is_active: true,
      });

    if (insertError) {
      return res.status(500).json({ success: false, error: '학생 추가 실패', details: insertError.message });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('[Add Student] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
