/**
 * GET /api/student/exams/[examId]/questions
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

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

  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ success: false, error: '학생 ID가 필요합니다' });
  }

  try {
    const supabase = createClient();

    // 1. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, time_limit_minutes, total_points, instructions')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 2. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status, start_time, end_time')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return res.status(403).json({ success: false, error: '배정된 시험이 아닙니다' });
    }

    // 마감 확인
    if (new Date(assignment.end_time) < new Date()) {
      return res.status(403).json({ success: false, error: '시험 기간이 종료되었습니다' });
    }

    // 3. 문제 목록 조회
    const { data: examQuestions, error: questionsError } = await supabase
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
      .order('order_num', { ascending: true });

    if (questionsError) {
      return res.status(500).json({ success: false, error: '문제 조회 실패' });
    }

    // 4. 응답 구성 (정답은 제외!)
    const questions = examQuestions?.map((eq) => {
      const questionData = eq.question as any;
      const question = Array.isArray(questionData) ? questionData[0] : questionData;
      const passage = (question?.metadata as Record<string, unknown>)?.passage || null;
      
      return {
        id: question?.id || '',
        examQuestionId: eq.id,
        orderNum: eq.order_num,
        type: question?.type || 'multiple_choice',
        content: question?.content || '',
        passage: passage,
        choices: question?.choices || [],
        points: eq.points || 2,
      };
    }) || [];

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

  } catch (error: any) {
    console.error('[Student Questions] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
