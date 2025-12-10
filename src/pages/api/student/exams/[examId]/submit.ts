/**
 * POST /api/student/exams/[examId]/submit
 * Pages Router API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS, SUBMISSION_STATUS } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { examId } = req.query;
  const { studentId, answers, timeSpent } = req.body || {};

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  if (!studentId || !answers?.length) {
    return res.status(400).json({ success: false, error: '학생 ID와 답안이 필요합니다' });
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
      return res.status(400).json({ success: false, error: '배정된 시험이 아닙니다' });
    }

    if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, error: '이미 제출한 시험입니다' });
    }

    // 2. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, academy_id, total_points')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 3. 문제 정답 조회
    const { data: examQuestions, error: questionsError } = await supabase
      .from('exam_questions')
      .select(`
        id,
        question_id,
        points,
        question:questions(
          id,
          type,
          correct_answer
        )
      `)
      .eq('exam_id', examId);

    if (questionsError || !examQuestions) {
      return res.status(500).json({ success: false, error: '문제 조회 실패' });
    }

    // 4. 자동 채점
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;

    const gradingResults = answers.map((answer: { questionId: string; answer: string }) => {
      const examQuestion = examQuestions.find(
        (eq) => eq.question_id === answer.questionId
      );

      if (!examQuestion) {
        return {
          questionId: answer.questionId,
          studentAnswer: answer.answer,
          correctAnswer: '',
          isCorrect: false,
          earnedPoints: 0,
          maxPoints: 0,
        };
      }

      const questionData = examQuestion.question as any;
      const question = Array.isArray(questionData) ? questionData[0] : questionData;

      const points = examQuestion.points || 2;
      maxScore += points;

      const studentAnswerNorm = String(answer.answer || '').trim().toLowerCase();
      const correctAnswerNorm = String(question?.correct_answer || '').trim().toLowerCase();
      const isCorrect = studentAnswerNorm === correctAnswerNorm;

      if (isCorrect) {
        totalScore += points;
        correctCount++;
      }

      return {
        questionId: answer.questionId,
        studentAnswer: answer.answer,
        correctAnswer: question?.correct_answer || '',
        isCorrect,
        earnedPoints: isCorrect ? points : 0,
        maxPoints: points,
      };
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const now = new Date().toISOString();

    // 5. 배정 상태 업데이트
    await supabase
      .from('exam_assignments')
      .update({ status: ASSIGNMENT_STATUS.COMPLETED })
      .eq('id', assignment.id);

    // 6. 제출 저장
    await supabase
      .from('submissions')
      .insert({
        academy_id: exam.academy_id,
        student_id: studentId,
        assignment_type: 'exam',
        assignment_id: assignment.id,
        status: SUBMISSION_STATUS.GRADED,
        score: totalScore,
        max_score: maxScore,
        started_at: now,
        submitted_at: now,
        graded_at: now,
        time_spent_seconds: timeSpent || 0,
        metadata: {
          exam_id: examId,
          answers: gradingResults,
          percentage,
          correct_count: correctCount,
          total_count: answers.length,
        },
      });

    // 7. 오답 기록
    const wrongAnswers = gradingResults.filter((r: any) => !r.isCorrect && r.studentAnswer);
    
    for (const wrong of wrongAnswers) {
      await supabase
        .from('wrong_notes')
        .insert({
          academy_id: exam.academy_id,
          student_id: studentId,
          question_id: wrong.questionId,
          exam_id: examId,
          assignment_id: assignment.id,
          wrong_count: 1,
          times_wrong: 1,
          first_wrong_at: now,
          last_wrong_at: now,
          review_priority: 1,
          student_answer: wrong.studentAnswer,
        });
    }

    return res.status(200).json({
      success: true,
      score: totalScore,
      maxScore,
      percentage: percentage.toFixed(1),
      correctCount,
      totalCount: answers.length,
      wrongCount: wrongAnswers.length,
    });

  } catch (error: any) {
    console.error('[Submit] Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
}
