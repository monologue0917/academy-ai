// pages/api/admin/classes/[classId]/index.ts
// 반 상세 조회 / 삭제
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
  const { classId } = req.query;

  if (typeof classId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid classId' });
  }

  // GET: 반 상세 조회
  if (req.method === 'GET') {
    try {
      // 1. 반 정보 조회
      const { data: classData, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          grade,
          subject,
          is_active,
          created_at,
          teacher:users!classes_teacher_id_fkey(id, name)
        `)
        .eq('id', classId)
        .single();

      if (error || !classData) {
        return res.status(404).json({ success: false, error: '반을 찾을 수 없습니다' });
      }

      // 2. 반에 소속된 학생 목록 조회
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          student_id,
          enrolled_at,
          student:users!class_enrollments_student_id_fkey(id, name, email)
        `)
        .eq('class_id', classId)
        .eq('is_active', true);

      if (enrollError) {
        console.error('Enrollment fetch error:', enrollError);
      }

      // 학생 목록 포맷
      const students = (enrollments || []).map((e: any) => ({
        enrollmentId: e.id,
        studentId: e.student_id,
        name: e.student?.name || '이름 없음',
        email: e.student?.email || null,
        enrolledAt: e.enrolled_at,
      }));

      return res.status(200).json({ 
        success: true, 
        classInfo: {
          id: classData.id,
          name: classData.name,
          description: classData.description,
          grade: classData.grade,
          subject: classData.subject,
          teacher: classData.teacher,
        },
        students,
      });
    } catch (err) {
      console.error('Class GET error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  // DELETE: 반 삭제
  // - class_enrollments만 삭제 (반-학생 연결)
  // - exam_assignments는 유지 (학생 시험 기록 보존)
  // - 이유: 학생이 반을 옮기거나, 특강반이 끝나도 성적 기록은 남아야 함
  if (req.method === 'DELETE') {
    try {
      // 1. 진행 중인 시험 배정이 있는지 확인 (경고용)
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('is_active', true);

      const studentIds = (enrollments || []).map(e => e.student_id);
      
      let ongoingCount = 0;
      if (studentIds.length > 0) {
        const { count } = await supabase
          .from('exam_assignments')
          .select('*', { count: 'exact', head: true })
          .in('student_id', studentIds)
          .in('status', ['scheduled', 'ongoing']);
        
        ongoingCount = count || 0;
      }

      // 2. class_enrollments 삭제 (반-학생 연결만 끊음)
      await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId);

      // 3. 반 삭제
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      console.log(`[Class DELETE] Deleted class: ${classId}, students: ${studentIds.length}, ongoing assignments: ${ongoingCount}`);

      return res.status(200).json({ 
        success: true, 
        message: '반이 삭제되었습니다',
        note: ongoingCount > 0 
          ? `${ongoingCount}개의 진행 중인 시험 배정은 유지됩니다 (학생 기록 보존)`
          : undefined,
      });
    } catch (err) {
      console.error('Class DELETE error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
