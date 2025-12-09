/**
 * GET /api/admin/exams/[examId]/results
 * 
 * 시험 결과 분석 API (선생님용)
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSIGNMENT_STATUS } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();

    // 1. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, description, total_points, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { success: false, error: '시험을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 문제 목록 조회
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select(`
        id,
        question_id,
        order_num,
        points,
        question:questions(
          id,
          content,
          correct_answer,
          choices
        )
      `)
      .eq('exam_id', examId)
      .order('order_num', { ascending: true });

    // 3. 배정 목록 조회
    const { data: assignments } = await supabase
      .from('exam_assignments')
      .select(`
        id,
        student_id,
        status,
        student:users(
          id,
          name,
          student_number
        )
      `)
      .eq('exam_id', examId);

    // 4. 제출(submissions) 조회
    const assignmentIds = (assignments || []).map(a => a.id);
    
    const { data: submissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_type', 'exam')
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

    // 5. 통계 계산
    const totalAssigned = assignments?.length || 0;
    const completedAssignments = assignments?.filter(
      a => a.status === ASSIGNMENT_STATUS.COMPLETED
    ) || [];
    const totalCompleted = completedAssignments.length;

    const scores = (submissions || []).map(s => Number(s.score) || 0);
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // 6. 학생별 결과 구성
    const studentResults = (assignments || []).map(assignment => {
      // student 데이터 안전하게 추출
      const studentData = assignment.student as any;
      const student = Array.isArray(studentData) 
        ? studentData[0] 
        : studentData;
      
      const submission = (submissions || []).find(s => s.assignment_id === assignment.id);
      
      const metadata = submission?.metadata as {
        answers?: Array<{
          questionId: string;
          studentAnswer: string;
          isCorrect: boolean;
        }>;
        percentage?: number;
        correct_count?: number;
        total_count?: number;
      } | null;

      return {
        studentId: assignment.student_id,
        studentName: student?.name || '(알 수 없음)',
        studentNumber: student?.student_number || '',
        status: assignment.status,
        score: submission ? Number(submission.score) : null,
        maxScore: submission?.max_score || exam.total_points || 0,
        percentage: metadata?.percentage || 0,
        correctCount: metadata?.correct_count || 0,
        totalCount: metadata?.total_count || 0,
        submittedAt: submission?.submitted_at || null,
        answers: metadata?.answers || [],
      };
    }).sort((a, b) => {
      if (a.status === ASSIGNMENT_STATUS.COMPLETED && b.status !== ASSIGNMENT_STATUS.COMPLETED) return -1;
      if (a.status !== ASSIGNMENT_STATUS.COMPLETED && b.status === ASSIGNMENT_STATUS.COMPLETED) return 1;
      return (b.score || 0) - (a.score || 0);
    });

    // 7. 문항별 정답률 계산
    const questionStats = (examQuestions || []).map(eq => {
      // question 데이터 안전하게 추출
      const questionData = eq.question as any;
      const question = Array.isArray(questionData)
        ? questionData[0]
        : questionData;

      let totalAnswers = 0;
      let correctAnswers = 0;
      const answerDistribution: Record<string, number> = {};

      for (const result of studentResults) {
        const answer = result.answers.find(a => a.questionId === eq.question_id);
        if (answer) {
          totalAnswers++;
          if (answer.isCorrect) correctAnswers++;
          
          const key = answer.studentAnswer || '무응답';
          answerDistribution[key] = (answerDistribution[key] || 0) + 1;
        }
      }

      const correctRate = totalAnswers > 0 
        ? (correctAnswers / totalAnswers) * 100 
        : 0;

      return {
        questionId: eq.question_id,
        orderNum: eq.order_num,
        points: eq.points,
        content: question?.content?.slice(0, 100) || '',
        correctAnswer: question?.correct_answer || '',
        choices: question?.choices || [],
        totalAnswers,
        correctAnswers,
        correctRate: Math.round(correctRate * 10) / 10,
        answerDistribution,
      };
    });

    const hardQuestions = [...questionStats]
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalPoints: exam.total_points,
        timeLimitMinutes: exam.time_limit_minutes,
        questionCount: examQuestions?.length || 0,
      },
      stats: {
        totalAssigned,
        totalCompleted,
        completionRate: totalAssigned > 0 
          ? Math.round((totalCompleted / totalAssigned) * 100) 
          : 0,
        avgScore: Math.round(avgScore * 10) / 10,
        highestScore,
        lowestScore,
      },
      studentResults,
      questionStats,
      hardQuestions,
    });
  } catch (error) {
    console.error('[Exam Results] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
