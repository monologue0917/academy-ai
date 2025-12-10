/**
 * GET /api/student/exams/[examId]/result
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS, type SubmissionMetadata } from '@/types/database';

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

    // 1. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return res.status(404).json({ success: false, error: '시험 기록을 찾을 수 없습니다' });
    }

    if (assignment.status !== ASSIGNMENT_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, error: '아직 제출하지 않은 시험입니다' });
    }

    // 2. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 3. 제출 결과 조회
    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', assignment.id)
      .eq('assignment_type', 'exam')
      .single();

    // 4. 문제 정보 조회
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        id,
        question_id,
        order_num,
        points,
        question:questions(
          id,
          type,
          content,
          choices,
          correct_answer,
          explanation
        )
      `)
      .eq('exam_id', examId)
      .order('order_num', { ascending: true });

    // 5. metadata에서 answers 추출
    const metadata = submission?.metadata as SubmissionMetadata | null;
    const savedAnswers = metadata?.answers || [];
    const savedAnswersMap = new Map(
      savedAnswers.map(a => [a.questionId, a])
    );

    // 6. 결과 구성
    const answers = (examQuestions || []).map(eq => {
      const questionData = eq.question as any;
      const question = Array.isArray(questionData) ? questionData[0] : questionData;

      const savedAnswer = savedAnswersMap.get(eq.question_id);

      return {
        questionId: question?.id || eq.question_id,
        orderNum: eq.order_num,
        type: question?.type || 'multiple_choice',
        content: question?.content || '',
        choices: question?.choices || [],
        studentAnswer: savedAnswer?.studentAnswer || '',
        correctAnswer: question?.correct_answer || '',
        isCorrect: savedAnswer?.isCorrect || false,
        points: eq.points || 2,
        earnedPoints: savedAnswer?.earnedPoints || 0,
        explanation: question?.explanation || null,
      };
    });

    const totalScore = submission?.score || 0;
    const maxScore = submission?.max_score || exam.total_points || 0;
    const percentage = maxScore > 0 ? (Number(totalScore) / maxScore) * 100 : 0;
    const correctCount = answers.filter(a => a.isCorrect).length;

    return res.status(200).json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        questionCount: examQuestions?.length || 0,
      },
      result: {
        score: Number(totalScore),
        totalScore: maxScore,
        percentage,
        correctCount,
        totalCount: answers.length,
        completedAt: submission?.submitted_at || new Date().toISOString(),
      },
      answers,
    });

  } catch (error: any) {
    console.error('[Result API] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
