// pages/api/student/wrong-notes.ts
// 학생 오답노트 조회
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

  const { studentId } = req.query;

  if (typeof studentId !== 'string') {
    return res.status(400).json({ success: false, error: 'studentId required' });
  }

  try {
    // 1. 해당 학생의 submissions 먼저 조회
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('id, submitted_at')
      .eq('student_id', studentId);

    if (subError) {
      console.error('Submissions query error:', subError);
      return res.status(200).json({ success: true, wrongNotes: [], count: 0 });
    }

    if (!submissions || submissions.length === 0) {
      return res.status(200).json({ success: true, wrongNotes: [], count: 0 });
    }

    const submissionIds = submissions.map(s => s.id);
    const submissionMap = new Map(submissions.map(s => [s.id, s]));

    // 2. 틀린 답안 조회
    const { data: wrongAnswers, error: waError } = await supabase
      .from('submission_answers')
      .select('id, submission_id, question_id, student_answer, is_correct, created_at')
      .eq('is_correct', false)
      .in('submission_id', submissionIds);

    if (waError) {
      console.error('Wrong answers query error:', waError);
      return res.status(200).json({ success: true, wrongNotes: [], count: 0 });
    }

    if (!wrongAnswers || wrongAnswers.length === 0) {
      return res.status(200).json({ success: true, wrongNotes: [], count: 0 });
    }

    // 3. 문제 정보 조회
    const questionIds = [...new Set(wrongAnswers.map(a => a.question_id))];
    
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, type, content, choices, correct_answer, explanation, difficulty_level, tags')
      .in('id', questionIds);

    if (qError) {
      console.error('Questions query error:', qError);
    }

    const questionsMap = new Map((questions || []).map(q => [q.id, q]));

    // 4. 문제별 오답 횟수 집계
    const wrongCountMap = new Map<string, number>();
    const firstWrongMap = new Map<string, string>();
    const lastWrongMap = new Map<string, string>();
    const studentAnswerMap = new Map<string, string>();

    wrongAnswers.forEach((wa) => {
      const qId = wa.question_id;
      const count = wrongCountMap.get(qId) || 0;
      wrongCountMap.set(qId, count + 1);

      const submission = submissionMap.get(wa.submission_id);
      const submittedAt = submission?.submitted_at || wa.created_at;
      
      // first wrong
      if (!firstWrongMap.has(qId) || submittedAt < firstWrongMap.get(qId)!) {
        firstWrongMap.set(qId, submittedAt);
      }
      // last wrong (가장 최근 답안 저장)
      if (!lastWrongMap.has(qId) || submittedAt > lastWrongMap.get(qId)!) {
        lastWrongMap.set(qId, submittedAt);
        studentAnswerMap.set(qId, wa.student_answer);
      }
    });

    // 5. 중복 제거하고 프론트엔드 형식으로 변환
    const seenQuestions = new Set<string>();
    const wrongNotes = wrongAnswers
      .filter((wa) => {
        if (seenQuestions.has(wa.question_id)) return false;
        seenQuestions.add(wa.question_id);
        return true;
      })
      .map((wa) => {
        const question = questionsMap.get(wa.question_id);
        const wrongCount = wrongCountMap.get(wa.question_id) || 1;

        return {
          id: wa.id,
          questionId: wa.question_id,
          studentAnswer: studentAnswerMap.get(wa.question_id) || wa.student_answer,
          wrongCount,
          firstWrongAt: firstWrongMap.get(wa.question_id) || wa.created_at,
          lastWrongAt: lastWrongMap.get(wa.question_id) || wa.created_at,
          lastCorrectAt: null,
          reviewPriority: wrongCount >= 2 ? 2 : 1,
          notes: null,
          question: question ? {
            id: question.id,
            type: question.type || 'multiple_choice',
            content: question.content || '',
            choices: question.choices || [],
            correctAnswer: question.correct_answer || '',
            explanation: question.explanation || null,
            difficulty: question.difficulty_level || null,
            tags: question.tags || [],
          } : null,
        };
      })
      // question이 null인 항목 제거
      .filter(note => note.question !== null);

    console.log('[WrongNotes API] Found:', wrongNotes.length, 'wrong notes');

    return res.status(200).json({
      success: true,
      wrongNotes,
      count: wrongNotes.length,
    });
  } catch (err) {
    console.error('Wrong notes error:', err);
    return res.status(200).json({ success: true, wrongNotes: [], count: 0 });
  }
}
