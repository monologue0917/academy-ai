// pages/api/admin/exams/[examId]/index.ts
// 시험 상세 조회 / 삭제
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
  const { examId } = req.query;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  // GET: 시험 상세 조회
  if (req.method === 'GET') {
    try {
      // 1. 시험 기본 정보
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          description,
          time_limit_minutes,
          total_points,
          passing_score,
          instructions,
          settings,
          allow_retry,
          shuffle_questions,
          show_answer_after,
          created_at,
          updated_at,
          created_by
        `)
        .eq('id', examId)
        .single();

      if (examError || !exam) {
        return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
      }

      // 2. 문제 목록
      const { data: questions } = await supabase
        .from('exam_questions')
        .select(`
          id,
          order_num,
          points,
          question:questions(
            id,
            type,
            content,
            choices,
            correct_answer,
            explanation,
            difficulty_level,
            metadata
          )
        `)
        .eq('exam_id', examId)
        .order('order_num');

      // 3. 배정 현황
      const { data: assignments } = await supabase
        .from('exam_assignments')
        .select(`
          id,
          student_id,
          status,
          start_time,
          end_time,
          created_at,
          student:users!exam_assignments_student_id_fkey(id, name, email)
        `)
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      const formattedQuestions = (questions || []).map((eq: any) => ({
        id: eq.question?.id || eq.id,
        orderNum: eq.order_num,
        type: eq.question?.type || 'multiple_choice',
        content: eq.question?.content || '',
        choices: eq.question?.choices || [],
        correctAnswer: eq.question?.correct_answer || '',
        explanation: eq.question?.explanation,
        difficultyLevel: eq.question?.difficulty_level || 1,
        metadata: eq.question?.metadata || {},
        points: eq.points,
      }));

      const formattedAssignments = (assignments || []).map((a: any) => ({
        id: a.id,
        studentId: a.student_id,
        student: a.student,
        status: a.status,
        startTime: a.start_time,
        endTime: a.end_time,
        createdAt: a.created_at,
      }));

      const completedCount = formattedAssignments.filter((a: any) => a.status === 'completed').length;

      return res.status(200).json({
        success: true,
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration: exam.time_limit_minutes,
          timeLimitMinutes: exam.time_limit_minutes,
          totalPoints: exam.total_points,
          passingScore: exam.passing_score,
          instructions: exam.instructions,
          settings: exam.settings,
          allowRetry: exam.allow_retry,
          shuffleQuestions: exam.shuffle_questions,
          showAnswerAfter: exam.show_answer_after,
          createdAt: exam.created_at,
          updatedAt: exam.updated_at,
          createdBy: exam.created_by,
          status: 'published',
        },
        questions: formattedQuestions,
        assignments: formattedAssignments,
        stats: {
          totalAssignments: formattedAssignments.length,
          completedCount,
          submissionRate: formattedAssignments.length > 0
            ? Math.round((completedCount / formattedAssignments.length) * 100).toString()
            : '0',
          questionCount: formattedQuestions.length,
        },
      });
    } catch (err) {
      console.error('Exam GET error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  // DELETE: 시험 삭제 (모든 관련 데이터 정리)
  if (req.method === 'DELETE') {
    try {
      console.log(`[Exam DELETE] Starting deletion for exam: ${examId}`);

      // 1. 해당 시험의 모든 배정 ID 조회
      const { data: assignments } = await supabase
        .from('exam_assignments')
        .select('id')
        .eq('exam_id', examId);

      const assignmentIds = (assignments || []).map(a => a.id);
      console.log(`[Exam DELETE] Found ${assignmentIds.length} assignments`);

      // 2. 해당 배정들의 모든 submission ID 조회
      let submissionIds: string[] = [];
      if (assignmentIds.length > 0) {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id')
          .in('assignment_id', assignmentIds);
        
        submissionIds = (submissions || []).map(s => s.id);
        console.log(`[Exam DELETE] Found ${submissionIds.length} submissions`);
      }

      // 3. submission_answers 삭제 (가장 먼저!)
      if (submissionIds.length > 0) {
        const { error: saError } = await supabase
          .from('submission_answers')
          .delete()
          .in('submission_id', submissionIds);
        
        if (saError) console.error('submission_answers delete error:', saError);
      }

      // 4. submissions 삭제
      if (assignmentIds.length > 0) {
        const { error: subError } = await supabase
          .from('submissions')
          .delete()
          .in('assignment_id', assignmentIds);
        
        if (subError) console.error('submissions delete error:', subError);
      }

      // 5. exam_assignments 삭제
      const { error: assignError } = await supabase
        .from('exam_assignments')
        .delete()
        .eq('exam_id', examId);
      
      if (assignError) console.error('exam_assignments delete error:', assignError);

      // 6. exam_questions 삭제
      const { error: eqError } = await supabase
        .from('exam_questions')
        .delete()
        .eq('exam_id', examId);
      
      if (eqError) console.error('exam_questions delete error:', eqError);

      // 7. exams 삭제
      const { error: examError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (examError) {
        return res.status(500).json({ success: false, error: examError.message });
      }

      console.log(`[Exam DELETE] Successfully deleted exam: ${examId}`);

      return res.status(200).json({ 
        success: true, 
        message: '시험이 삭제되었습니다',
        deleted: {
          assignments: assignmentIds.length,
          submissions: submissionIds.length,
        }
      });
    } catch (err) {
      console.error('Exam DELETE error:', err);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
