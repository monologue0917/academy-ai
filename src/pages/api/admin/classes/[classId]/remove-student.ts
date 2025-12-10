/**
 * POST /api/admin/classes/[classId]/remove-student
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
  const { enrollmentId } = req.body;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  if (!enrollmentId) {
    return res.status(400).json({ success: false, error: 'enrollmentId가 필요합니다' });
  }

  try {
    const supabase = createClient();

    // Soft delete (is_active = false)
    const { error } = await supabase
      .from('class_enrollments')
      .update({ is_active: false })
      .eq('id', enrollmentId);

    if (error) {
      return res.status(500).json({ success: false, error: '학생 제거 실패' });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('[Remove Student] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
