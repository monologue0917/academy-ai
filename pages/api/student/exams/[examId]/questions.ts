// pages/api/student/exams/[examId]/questions.ts
// 학생용 시험 문제 조회
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

  const { examId, studentId } = req.query;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (typeof studentId !== 'string') {
    return res.status(400).json({ success: false, error: 'studentId required' });
  }

  try {
    // 1. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status, start_time, end_time')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return res.status(403).json({ success: false, error: '시험 권한이 없습니다' });
    }

    // 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return res.status(403).json({ success: false, error: '시험 기간이 종료되었습니다' });
    }

    // 2. 시험 정보
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        description,
        time_limit_minutes,
        total_points,
        instructions,
        shuffle_questions
      `)
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 3. 문제 목록 (정답 제외)
    const { data: examQuestions, error: qError } = await supabase
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
          metadata
        )
      `)
      .eq('exam_id', examId)
      .order('order_num');

    if (qError) {
      console.error('Questions fetch error:', qError);
      return res.status(500).json({ success: false, error: '문제 조회 실패' });
    }

    // 문제 포맷 (정답 제외!)
    const questions = (examQuestions || []).map((eq: any) => ({
      id: eq.question?.id || eq.id,
      examQuestionId: eq.id,
      orderNum: eq.order_num,
      type: eq.question?.type || 'multiple_choice',
      content: eq.question?.content || '',
      passage: eq.question?.metadata?.passage || null,
      choices: eq.question?.choices || [],
      points: eq.points,
      // 정답(correct_answer)은 포함하지 않음!
    }));

    return res.status(200).json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.time_limit_minutes,
        timeLimitMinutes: exam.time_limit_minutes,
        totalPoints: exam.total_points,
        instructions: exam.instructions,
      },
      assignment: {
        id: assignment.id,
        status: assignment.status,
        startTime: assignment.start_time,
        endTime: assignment.end_time,
      },
      questions,
      questionCount: questions.length,
    });
  } catch (err) {
    console.error('Questions error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
