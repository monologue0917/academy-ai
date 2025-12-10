// pages/api/admin/classes/create.ts
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

  try {
    const { name, description, grade, academyId, teacherId } = req.body;

    if (!name || !academyId) {
      return res.status(400).json({ 
        success: false, 
        error: '반 이름과 학원 ID는 필수입니다' 
      });
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        description: description || null,
        grade: grade || null,
        academy_id: academyId,
        teacher_id: teacherId || null,
        is_active: true,
      })
      .select(`
        id,
        name,
        description,
        grade,
        is_active,
        created_at,
        teacher:users!classes_teacher_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Class create error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ 
      success: true, 
      class: { ...data, studentCount: 0 },
      message: '반이 생성되었습니다' 
    });
  } catch (err) {
    console.error('Class create error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
