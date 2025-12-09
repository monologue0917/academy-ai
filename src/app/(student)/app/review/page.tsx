'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 복습 화면
 * 
 * 기능:
 * 1. 오늘의 오답 10문제 표시
 * 2. 문제별 "정답 보기" 토글
 * 3. 통계 표시
 */

interface ReviewQuestion {
  wrongNoteId: string;
  questionId: string;
  type: string;
  content: string;
  passage: string | null;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  points: number;
  studentAnswer: string;
  timesWrong: number;
  lastWrongAt: string;
  reviewCount: number;
  mastered: boolean;
}

interface ReviewData {
  success: boolean;
  questions: ReviewQuestion[];
  stats: {
    totalWrong: number;
    reviewedToday: number;
    todayLimit: number;
    remaining: number;
  };
}

export default function ReviewPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      fetchReviewQuestions();
    }
  }, [user?.id]);

  const fetchReviewQuestions = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/student/review/today?studentId=${user.id}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || '복습 문제를 불러올 수 없습니다');
      }
    } catch (err: any) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnswer = (questionId: string) => {
    const newShowAnswers = new Set(showAnswers);
    if (newShowAnswers.has(questionId)) {
      newShowAnswers.delete(questionId);
    } else {
      newShowAnswers.add(questionId);
    }
    setShowAnswers(newShowAnswers);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">복습 문제 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center">
          <p className="text-rose-600 mb-4">{error || '복습 문제를 찾을 수 없습니다'}</p>
          <Button onClick={() => router.push('/app')}>
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const { questions, stats } = data;

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            오늘의 복습
          </h1>
          <p className="text-sm text-slate-600">
            틀린 문제를 다시 풀어보세요
          </p>
        </div>

        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            복습할 문제가 없습니다!
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            모든 오답을 정복했거나, 아직 시험을 보지 않았습니다
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push('/app')}>
              홈으로
            </Button>
            <Button variant="primary" onClick={() => router.push('/app/exams')}>
              시험 보러 가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              오늘의 복습 📚
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              틀린 문제를 다시 풀어보세요
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchReviewQuestions}>
            🔄
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="총 오답" value={stats.totalWrong} color="rose" />
          <StatCard label="오늘 복습" value={questions.length} color="indigo" />
          <StatCard label="남은 오답" value={stats.remaining} color="slate" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">복습 팁</h3>
            <p className="text-xs text-slate-600">
              자주 틀린 문제일수록 상단에 표시됩니다. 
              정답을 외우기보다는 문제 풀이 과정을 이해하는 데 집중하세요!
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          문제 목록
        </h2>

        {questions.map((question, index) => (
          <ReviewQuestionCard
            key={question.questionId}
            question={question}
            index={index + 1}
            showAnswer={showAnswers.has(question.questionId)}
            onToggleAnswer={() => toggleAnswer(question.questionId)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push('/app')} fullWidth>
          홈으로
        </Button>
        <Button variant="primary" onClick={() => router.push('/app/wrong-notes')} fullWidth>
          전체 오답노트
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'rose' | 'indigo' | 'slate' }) {
  const colors = {
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };

  return (
    <div className={`rounded-xl p-3 border ${colors[color]}`}>
      <p className="text-xs mb-1 opacity-80">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReviewQuestionCard({ question, index, showAnswer, onToggleAnswer }: {
  question: ReviewQuestion;
  index: number;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-semibold">
            {index}
          </span>
          <div className="flex-1">
            <p className="text-slate-900 font-medium mb-2">{question.content}</p>
            {question.passage && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700 line-clamp-4">{question.passage}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge variant="warning">{question.timesWrong}회 틀림</Badge>
          <span className="text-xs text-slate-500">{question.points}점</span>
        </div>
      </div>

      {question.type === 'mcq' && question.options && (
        <div className="mb-4 space-y-2">
          {question.options.map((option, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                showAnswer && question.correctAnswer === String(i + 1)
                  ? 'border-green-500 bg-green-50'
                  : showAnswer && question.studentAnswer === String(i + 1)
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <span className="text-sm">
                <span className="font-semibold mr-2">{i + 1}.</span>
                {option}
              </span>
            </div>
          ))}
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">내 답안</p>
          <p className="text-sm font-medium text-slate-900">
            {question.studentAnswer || '(미응답)'}
          </p>
        </div>
      )}

      <button
        onClick={onToggleAnswer}
        className="w-full py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        {showAnswer ? '정답 닫기 ▲' : '정답 보기 ▼'}
      </button>

      {showAnswer && (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-xs text-green-600 font-semibold mb-1">✓ 정답</p>
            <p className="text-sm font-medium text-green-900">
              {formatAnswer(question.correctAnswer, question.type, question.options)}
            </p>
          </div>

          {question.explanation && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-600 font-semibold mb-2">📖 해설</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{question.explanation}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>마지막으로 틀린 날: {formatDate(question.lastWrongAt)}</span>
            <span>복습 횟수: {question.reviewCount}회</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAnswer(answer: string, type: string, options: string[] | null): string {
  if (type === 'mcq' && options) {
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < options.length) {
      return `${answer}번. ${options[index]}`;
    }
    return `${answer}번`;
  }
  return answer || '(정답 없음)';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}
