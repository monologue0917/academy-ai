// pages/api/admin/classes/index.ts
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
  // GET: 반 목록 조회
  if (req.method === 'GET') {
    try {
      const { academyId } = req.query;

      let query = supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          grade,
          is_active,
          created_at,
          teacher:users!classes_teacher_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (academyId) {
        query = query.eq('academy_id', academyId);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      // 각 반의 학생 수 조회
      const classesWithCount = await Promise.all(
        (data || []).map(async (cls: any) => {
          const { count } = await supabase
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          return {
            ...cls,
            studentCount: count || 0,
          };
        })
      );

      return res.status(200).json({ success: true, classes: classesWithCount });
    } catch (err) {
      console.error('Classes GET error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
