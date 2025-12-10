// pages/api/admin/exams/[examId]/results.ts
// 시험 결과 분석 (선생님용)
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

  const { examId } = req.query;

  if (typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'invalid examId' });
  }

  try {
    // 1. 시험 정보
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ success: false, error: '시험을 찾을 수 없습니다' });
    }

    // 2. 문제 목록
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        id,
        order_num,
        points,
        question:questions(id, content, correct_answer, choices)
      `)
      .eq('exam_id', examId)
      .order('order_num');

    const questionCount = examQuestions?.length || 0;

    // 3. 배정 + 제출 정보
    const { data: assignments } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        student_id,
        status,
        student:users!exam_assignments_student_id_fkey(id, name, email, student_number)
      `)
      .eq('exam_id', examId);

    // 4. 제출 정보 조회
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        score,
        total_score,
        correct_count,
        total_count,
        completed_at
      `)
      .eq('exam_id', examId);

    // 제출 정보를 student_id로 매핑
    const submissionMap = new Map();
    (submissions || []).forEach(s => {
      submissionMap.set(s.student_id, s);
    });

    // 5. 학생별 결과 정리
    const studentResults = (assignments || []).map((a: any) => {
      const submission = submissionMap.get(a.student_id);
      const score = submission?.score || 0;
      const maxScore = exam.total_points || 100;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      return {
        studentId: a.student_id,
        studentName: a.student?.name || '이름 없음',
        studentNumber: a.student?.student_number || '-',
        status: a.status,
        score: submission ? score : null,
        maxScore,
        percentage,
        correctCount: submission?.correct_count || 0,
        totalCount: questionCount,
        submittedAt: submission?.completed_at || null,
      };
    });

    // 6. 통계 계산
    const completedResults = studentResults.filter(r => r.status === 'completed' && r.score !== null);
    const scores = completedResults.map(r => r.score as number);

    const stats = {
      totalAssigned: studentResults.length,
      totalCompleted: completedResults.length,
      completionRate: studentResults.length > 0 
        ? Math.round((completedResults.length / studentResults.length) * 100) 
        : 0,
      avgScore: scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    };

    // 7. 문항별 정답률 (간단 버전)
    const questionStats = (examQuestions || []).map((eq: any) => ({
      questionId: eq.question?.id || eq.id,
      orderNum: eq.order_num,
      points: eq.points,
      content: eq.question?.content || '',
      correctAnswer: eq.question?.correct_answer || '',
      correctRate: 0, // TODO: 실제 정답률 계산
      answerDistribution: {},
    }));

    // 어려운 문제 (정답률 50% 미만) - 현재는 빈 배열
    const hardQuestions: typeof questionStats = [];

    return res.status(200).json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        questionCount,
      },
      stats,
      studentResults,
      questionStats,
      hardQuestions,
    });
  } catch (err) {
    console.error('Results error:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
