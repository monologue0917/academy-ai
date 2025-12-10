/**
 * GET/DELETE /api/admin/classes/[classId]
 * Pages Router API (Vercel App Router 동적 라우트 버그 우회)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query: { classId }, method } = req;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  const supabase = createClient();

  // GET: 반 상세 조회
  if (method === 'GET') {
    try {
      // 1. 반 정보 조회
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('is_active', true)
        .single();

      if (classError || !classData) {
        return res.status(404).json({ success: false, error: '반을 찾을 수 없습니다' });
      }

      // 2. 담당 선생님 정보
      let teacher = null;
      if (classData.teacher_id) {
        const { data: teacherData } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', classData.teacher_id)
          .single();
        teacher = teacherData;
      }

      // 3. 소속 학생 목록
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('id, student_id, created_at')
        .eq('class_id', classId)
        .eq('is_active', true);

      // 학생 정보 가져오기
      const students = [];
      if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
          const { data: student } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', enrollment.student_id)
            .single();
          
          if (student) {
            students.push({
              enrollmentId: enrollment.id,
              studentId: enrollment.student_id,
              name: student.name,
              email: student.email,
              enrolledAt: enrollment.created_at,
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        classInfo: {
          id: classData.id,
          name: classData.name,
          description: classData.description,
          grade: classData.grade,
          teacher,
        },
        students,
      });

    } catch (error: any) {
      console.error('[Class Detail] Error:', error);
      return res.status(500).json({ success: false, error: '서버 오류', details: error.message });
    }
  }

  // DELETE: 반 삭제 (비활성화)
  if (method === 'DELETE') {
    try {
      const academyId = req.query.academyId as string | undefined;

      // 삭제 (비활성화)
      const { error } = await supabase
        .from('classes')
        .update({ is_active: false })
        .eq('id', classId);

      if (error) {
        console.error('[Class Delete] Failed:', error);
        return res.status(500).json({ success: false, error: '반 삭제 실패' });
      }

      // 삭제 후 같은 연결에서 업데이트된 목록 반환
      if (academyId) {
        const { data: updatedClasses } = await supabase
          .from('classes')
          .select('id, name, description, grade, is_active, teacher_id')
          .eq('academy_id', academyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const classesWithDetails = await Promise.all(
          (updatedClasses || []).map(async (cls) => {
            const { count } = await supabase
              .from('class_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id)
              .eq('is_active', true);

            let teacher = null;
            if (cls.teacher_id) {
              const { data: teacherData } = await supabase
                .from('users')
                .select('id, name')
                .eq('id', cls.teacher_id)
                .single();
              teacher = teacherData;
            }

            return {
              id: cls.id,
              name: cls.name,
              description: cls.description,
              grade: cls.grade,
              teacher,
              studentCount: count || 0,
            };
          })
        );

        return res.status(200).json({ success: true, classes: classesWithDetails });
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[Class Delete] Exception:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  // 지원하지 않는 메서드
  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
