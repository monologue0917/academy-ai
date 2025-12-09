'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 시험 결과 화면 (AI 해설 없음 - 오답노트에서만 제공)
 */

interface ResultData {
  success: boolean;
  exam: {
    id: string;
    title: string;
    totalPoints: number;
    questionCount: number;
  };
  result: {
    score: number;
    totalScore: number;
    percentage: number;
    correctCount: number;
    totalCount: number;
    completedAt: string;
  };
  answers: Array<{
    questionId: string;
    orderNum: number;
    content: string;
    choices: string[];
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    earnedPoints: number;
    explanation: string | null;
  }>;
}

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const examId = params.examId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      fetchResult();
    }
  }, [user?.id, examId]);

  const fetchResult = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/student/exams/${examId}/result?studentId=${user.id}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || '결과를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('[Result] Error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">결과 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-rose-600 mb-4">{error || '결과를 찾을 수 없습니다'}</p>
        <Button onClick={() => router.push('/app/exams')}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const { exam, result, answers } = data;

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 70) return { grade: 'C', color: 'text-indigo-600' };
    if (percentage >= 60) return { grade: 'D', color: 'text-amber-600' };
    return { grade: 'F', color: 'text-rose-600' };
  };

  const grade = getGrade(result.percentage);
  const wrongCount = result.totalCount - result.correctCount;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
        <p className="text-sm text-slate-600">시험 결과</p>
      </div>

      {/* 점수 카드 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="text-center space-y-4">
          <div>
            <p className="text-sm opacity-90 mb-2">총점</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold">{result.score}</span>
              <span className="text-2xl opacity-80">/ {result.totalScore}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-sm opacity-90">퍼센트</p>
              <p className="text-2xl font-semibold">
                {result.percentage.toFixed(1)}%
              </p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <p className="text-sm opacity-90">등급</p>
              <p className="text-2xl font-semibold">{grade.grade}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 mb-1">정답</p>
          <p className="text-lg font-semibold text-green-700">{result.correctCount}문제</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-xs text-rose-600 mb-1">오답</p>
          <p className="text-lg font-semibold text-rose-700">{wrongCount}문제</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs text-indigo-600 mb-1">정답률</p>
          <p className="text-lg font-semibold text-indigo-700">{result.percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* 오답노트 버튼 */}
      <Button
        variant="primary"
        onClick={() => router.push('/app/wrong-notes')}
        fullWidth
      >
        📝 오답노트 보기
      </Button>

      {/* 문제별 결과 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">문제별 결과</h2>

        {answers.map((answer) => (
          <QuestionResultCard
            key={answer.questionId}
            answer={answer}
            isExpanded={expandedQuestions.has(answer.questionId)}
            onToggle={() => toggleQuestion(answer.questionId)}
          />
        ))}
      </div>

      {/* 하단 버튼 */}
      <Button
        variant="secondary"
        onClick={() => router.push('/app/exams')}
        fullWidth
      >
        목록으로 돌아가기
      </Button>
    </div>
  );
}

// ============================================
// QuestionResultCard 컴포넌트 (AI 해설 없는 버전)
// ============================================

interface Answer {
  questionId: string;
  orderNum: number;
  content: string;
  choices: string[];
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
  explanation: string | null;
}

function QuestionResultCard({
  answer,
  isExpanded,
  onToggle,
}: {
  answer: Answer;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 border-2 ${
        answer.isCorrect
          ? 'border-green-200'
          : 'border-rose-200'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
              answer.isCorrect
                ? 'bg-green-100 text-green-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {answer.orderNum}
          </span>
          <p className="text-slate-900 text-sm line-clamp-2">{answer.content}</p>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-slate-500">
            {answer.earnedPoints}/{answer.points}점
          </span>
          {answer.isCorrect ? (
            <Badge variant="success">정답</Badge>
          ) : (
            <Badge variant="danger">오답</Badge>
          )}
        </div>
      </div>

      {/* 답안 비교 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">내 답안</p>
          <p className="text-sm font-medium text-slate-900">
            {answer.studentAnswer ? `${answer.studentAnswer}번` : '(미응답)'}
          </p>
        </div>
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">정답</p>
          <p className="text-sm font-medium text-green-700">
            {answer.correctAnswer}번
          </p>
        </div>
      </div>

      {/* 해설 버튼 (기본 해설만) */}
      {answer.explanation && (
        <button
          onClick={onToggle}
          className="w-full py-2 text-sm text-slate-600 font-medium hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          {isExpanded ? '해설 닫기 ▲' : '📖 해설 보기'}
        </button>
      )}

      {/* 기본 해설 */}
      {isExpanded && answer.explanation && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {answer.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
