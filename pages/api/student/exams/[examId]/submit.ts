// pages/api/student/exams/[examId]/submit.ts
// 학생 시험 제출 및 자동 채점
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnswerInput {
  questionId: string;
  examQuestionId: string;
  answer: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId } = req.query;
  const { studentId, answers, timeSpent } = req.body as {
    studentId: string;
    answers: AnswerInput[];
    timeSpent: number;
  };

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (!studentId || !answers) {
    return res.status(400).json({ success: false, error: 'studentId and answers required' });
  }

  try {
    // 1. 배정 확인
    const { data: assignment, error: assignError } = await supabase
      .from('exam_assignments')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (assignError || !assignment) {
      return res.status(403).json({ success: false, error: '시험 권한이 없습니다' });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ success: false, error: '이미 제출한 시험입니다' });
    }

    // 2. 문제 및 정답 조회
    const { data: examQuestions, error: qError } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_num,
        points,
        question:questions(id, correct_answer)
      `)
      .eq('exam_id', examId);

    if (qError || !examQuestions) {
      return res.status(500).json({ success: false, error: '문제 조회 실패' });
    }

    // 정답 맵 생성
    const answerMap = new Map<string, { correctAnswer: string; points: number }>();
    examQuestions.forEach((eq: any) => {
      answerMap.set(eq.id, {
        correctAnswer: eq.question?.correct_answer || '',
        points: eq.points || 1,
      });
    });

    // 3. 채점
    let score = 0;
    let correctCount = 0;
    const totalCount = examQuestions.length;

    const gradedAnswers = answers.map((ans) => {
      const questionData = answerMap.get(ans.examQuestionId);
      const isCorrect = questionData 
        ? ans.answer.trim() === questionData.correctAnswer.trim()
        : false;
      
      if (isCorrect && questionData) {
        score += questionData.points;
        correctCount++;
      }

      return {
        exam_question_id: ans.examQuestionId,
        question_id: ans.questionId,
        student_answer: ans.answer,
        is_correct: isCorrect,
        earned_points: isCorrect ? (questionData?.points || 0) : 0,
      };
    });

    // 4. submission 생성
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        exam_id: examId,
        student_id: studentId,
        assignment_id: assignment.id,
        score,
        total_score: examQuestions.reduce((sum: number, eq: any) => sum + (eq.points || 1), 0),
        correct_count: correctCount,
        total_count: totalCount,
        time_spent: timeSpent || 0,
        status: 'graded',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('Submission insert error:', subError);
      return res.status(500).json({ success: false, error: '제출 저장 실패' });
    }

    // 5. submission_answers 생성
    const answersToInsert = gradedAnswers.map((ga) => ({
      submission_id: submission.id,
      exam_question_id: ga.exam_question_id,
      question_id: ga.question_id,
      student_answer: ga.student_answer,
      is_correct: ga.is_correct,
      earned_points: ga.earned_points,
    }));

    const { error: ansError } = await supabase
      .from('submission_answers')
      .insert(answersToInsert);

    if (ansError) {
      console.error('Submission answers insert error:', ansError);
      // 계속 진행 (치명적이지 않음)
    }

    // 6. assignment 상태 업데이트
    await supabase
      .from('exam_assignments')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignment.id);

    return res.status(200).json({
      success: true,
      message: '시험이 제출되었습니다',
      submission: {
        id: submission.id,
        score,
        totalScore: submission.total_score,
        correctCount,
        totalCount,
      },
    });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
