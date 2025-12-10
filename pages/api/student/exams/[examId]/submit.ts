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
      console.error('Assignment error:', assignError);
      return res.status(403).json({ success: false, error: '시험 권한이 없습니다' });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ success: false, error: '이미 제출한 시험입니다' });
    }

    // 2. 학생의 academy_id 조회
    const { data: student } = await supabase
      .from('users')
      .select('academy_id')
      .eq('id', studentId)
      .single();

    // 3. 문제 및 정답 조회
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
      console.error('Questions error:', qError);
      return res.status(500).json({ success: false, error: '문제 조회 실패' });
    }

    // 정답 맵 생성 (question_id 기준)
    const answerMap = new Map<string, { correctAnswer: string; points: number; questionId: string }>();
    examQuestions.forEach((eq: any) => {
      const questionId = eq.question?.id;
      if (questionId) {
        answerMap.set(eq.id, {
          correctAnswer: eq.question?.correct_answer || '',
          points: eq.points || 1,
          questionId: questionId,
        });
      }
    });

    // 4. 채점
    let score = 0;
    let correctCount = 0;
    const totalCount = examQuestions.length;
    const maxScore = examQuestions.reduce((sum: number, eq: any) => sum + (eq.points || 1), 0);

    const gradedAnswers = answers.map((ans) => {
      const questionData = answerMap.get(ans.examQuestionId);
      const isCorrect = questionData 
        ? ans.answer.trim() === questionData.correctAnswer.trim()
        : false;
      
      const earnedPoints = isCorrect ? (questionData?.points || 0) : 0;
      if (isCorrect) {
        score += earnedPoints;
        correctCount++;
      }

      return {
        question_id: questionData?.questionId || ans.questionId,
        student_answer: ans.answer,
        is_correct: isCorrect,
        points_earned: earnedPoints,
        max_points: questionData?.points || 0,
      };
    });

    // 5. submission 생성
    const now = new Date().toISOString();
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        academy_id: student?.academy_id,
        student_id: studentId,
        assignment_type: 'exam',
        assignment_id: assignment.id,
        status: 'graded',
        score,
        max_score: maxScore,
        started_at: now,
        submitted_at: now,
        graded_at: now,
        time_spent_seconds: timeSpent || 0,
      })
      .select()
      .single();

    if (subError) {
      console.error('Submission insert error:', subError);
      return res.status(500).json({ success: false, error: `제출 저장 실패: ${subError.message}` });
    }

    // 6. submission_answers 생성 (올바른 컬럼명 사용)
    const answersToInsert = gradedAnswers.map((ga) => ({
      submission_id: submission.id,
      question_id: ga.question_id,
      student_answer: ga.student_answer,
      is_correct: ga.is_correct,
      points_earned: ga.points_earned,
      max_points: ga.max_points,
    }));

    const { error: ansError } = await supabase
      .from('submission_answers')
      .insert(answersToInsert);

    if (ansError) {
      console.error('Submission answers insert error:', ansError);
    }

    // 7. assignment 상태 업데이트
    await supabase
      .from('exam_assignments')
      .update({ 
        status: 'completed',
        updated_at: now,
      })
      .eq('id', assignment.id);

    return res.status(200).json({
      success: true,
      message: '시험이 제출되었습니다',
      submission: {
        id: submission.id,
        score,
        totalScore: maxScore,
        correctCount,
        totalCount,
      },
    });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
