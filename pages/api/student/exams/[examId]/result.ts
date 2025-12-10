// pages/api/student/exams/[examId]/result.ts
// 학생 시험 결과 조회
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
    // 1. 시험 정보
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, total_points')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 2. 제출 정보
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (subError || !submission) {
      return res.status(404).json({ success: false, error: '제출 기록이 없습니다' });
    }

    // 3. 문제별 답안 조회
    const { data: submissionAnswers } = await supabase
      .from('submission_answers')
      .select(`
        id,
        exam_question_id,
        question_id,
        student_answer,
        is_correct,
        earned_points
      `)
      .eq('submission_id', submission.id);

    // 4. 문제 정보 조회
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_num,
        points,
        question:questions(
          id,
          content,
          choices,
          correct_answer,
          explanation
        )
      `)
      .eq('exam_id', examId)
      .order('order_num');

    // 답안 맵 생성
    const answerMap = new Map();
    (submissionAnswers || []).forEach((sa: any) => {
      answerMap.set(sa.exam_question_id, sa);
    });

    // 5. 결과 포맷팅
    const answers = (examQuestions || []).map((eq: any) => {
      const studentAnswer = answerMap.get(eq.id);
      return {
        questionId: eq.question?.id || eq.id,
        orderNum: eq.order_num,
        content: eq.question?.content || '',
        choices: eq.question?.choices || [],
        studentAnswer: studentAnswer?.student_answer || '',
        correctAnswer: eq.question?.correct_answer || '',
        isCorrect: studentAnswer?.is_correct || false,
        points: eq.points,
        earnedPoints: studentAnswer?.earned_points || 0,
        explanation: eq.question?.explanation || null,
      };
    });

    const percentage = exam.total_points > 0
      ? Math.round((submission.score / exam.total_points) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        totalPoints: exam.total_points,
        questionCount: answers.length,
      },
      result: {
        score: submission.score,
        totalScore: submission.total_score,
        percentage,
        correctCount: submission.correct_count,
        totalCount: submission.total_count,
        completedAt: submission.completed_at,
      },
      answers,
    });
  } catch (err) {
    console.error('Result error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
