'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 시험 응시 화면
 */

interface Question {
  id: string;
  examQuestionId: string;
  orderNum: number;
  type: string;
  content: string;
  passage: string | null;
  choices: string[];
  points: number;
}

interface ExamInfo {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  timeLimitMinutes: number;
  totalPoints: number;
  instructions: string | null;
}

export default function ExamTakePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const examId = params.examId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4200); // 70분 = 4200초
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchQuestions();
    }
  }, [user?.id, examId]);

  useEffect(() => {
    if (!isLoading && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLoading, timeLeft]);

  // 제출 중 프로그레스 애니메이션
  useEffect(() => {
    if (isSubmitting && submitProgress < 90) {
      const timer = setInterval(() => {
        setSubmitProgress(prev => {
          if (prev < 30) return prev + 10;
          if (prev < 60) return prev + 5;
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isSubmitting, submitProgress]);

  const fetchQuestions = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      console.log('[ExamTake] Fetching questions:', examId, 'studentId:', user.id);
      
      const response = await fetch(
        `/api/student/exams/${examId}/questions?studentId=${user.id}`
      );
      const data = await response.json();

      console.log('[ExamTake] Response:', data);

      if (response.ok && data.success) {
        setQuestions(data.questions || []);
        setExamInfo(data.exam);
        setTimeLeft((data.exam.duration || data.exam.timeLimitMinutes) * 60);
      } else {
        setError(data.error || '문제를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('[ExamTake] Error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    await handleSubmit(true);
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!user?.id || !examInfo) return;

    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;

    if (!isAutoSubmit && answeredCount < totalCount) {
      if (
        !confirm(
          `${totalCount - answeredCount}문제가 미응답 상태입니다. 제출하시겠습니까?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitProgress(0);

    try {
      const answerArray = questions.map((q) => ({
        questionId: q.id,
        examQuestionId: q.examQuestionId,
        answer: answers[q.id] || '',
      }));

      const duration = (examInfo.duration || examInfo.timeLimitMinutes) * 60;
      const timeSpent = duration - timeLeft;

      const response = await fetch(
        `/api/student/exams/${examId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: user.id,
            answers: answerArray,
            timeSpent: timeSpent,
          }),
        }
      );

      const data = await response.json();

      setSubmitProgress(100);

      if (response.ok && data.success) {
        // 잠시 대기 후 결과 페이지로 이동
        setTimeout(() => {
          router.push(`/app/exams/${examId}/result`);
        }, 500);
      } else {
        alert(data.error || '제출 실패');
        setIsSubmitting(false);
        setSubmitProgress(0);
      }
    } catch (err) {
      console.error('[ExamTake] Submit error:', err);
      alert('서버 오류가 발생했습니다');
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  };

  // 제출 중 오버레이
  if (isSubmitting) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center z-50">
        <div className="text-center text-white p-8">
          {/* 애니메이션 아이콘 */}
          <div className="mb-8">
            <div className="relative w-32 h-32 mx-auto">
              {/* 외부 원 */}
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              {/* 회전하는 원 */}
              <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
              {/* 중앙 아이콘 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 텍스트 */}
          <h2 className="text-2xl font-bold mb-2">답안 제출 중...</h2>
          <p className="text-white/80 mb-6">잠시만 기다려주세요</p>

          {/* 프로그레스 바 */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${submitProgress}%` }}
              />
            </div>
            <p className="text-sm text-white/60 mt-2">{submitProgress}%</p>
          </div>

          {/* 안내 문구 */}
          <div className="mt-8 space-y-2 text-sm text-white/60">
            <p>✓ 답안 저장 중</p>
            <p>✓ 자동 채점 진행 중</p>
            <p>✓ 결과 분석 중</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">문제를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-rose-600 mb-4">{error}</p>
        <Button onClick={() => router.push('/app/exams')}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-slate-600 mb-4">문제가 없습니다</p>
        <Button onClick={() => router.push('/app/exams')}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-slate-600 mb-4">문제를 불러올 수 없습니다</p>
        <Button onClick={() => router.push('/app/exams')}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
      {/* 헤더: 타이머 + 진행률 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600">
            {currentIndex + 1} / {questions.length}
            <span className="ml-2 text-indigo-600">
              ({answeredCount}개 응답)
            </span>
          </div>
          <Timer seconds={timeLeft} />
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문제 카드 */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            문제 {currentQuestion.orderNum}
          </h2>
          <span className="text-sm font-medium text-indigo-600">
            {currentQuestion.points}점
          </span>
        </div>

        {/* 지문 */}
        {currentQuestion.passage && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {currentQuestion.passage}
            </p>
          </div>
        )}

        {/* 문제 */}
        <p className="text-slate-900 mb-6 whitespace-pre-wrap">
          {currentQuestion.content}
        </p>

        {/* 답안 입력 */}
        <AnswerInput
          question={currentQuestion}
          value={answers[currentQuestion.id] || ''}
          onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
        />
      </div>

      {/* 문제 번호 퀵 네비게이션 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <p className="text-sm text-slate-600 mb-3">문제 이동</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                idx === currentIndex
                  ? 'bg-indigo-600 text-white'
                  : answers[q.id]
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {q.orderNum}
            </button>
          ))}
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          fullWidth
        >
          이전
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="primary"
            onClick={() => setCurrentIndex(currentIndex + 1)}
            fullWidth
          >
            다음
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            fullWidth
          >
            제출하기
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// 답안 입력 컴포넌트
// ============================================

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}) {
  // 객관식 (multiple_choice)
  if ((question.type === 'multiple_choice' || question.type === 'mcq') && question.choices && question.choices.length > 0) {
    return (
      <div className="space-y-3">
        {question.choices.map((choice, index) => (
          <label
            key={index}
            className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
              value === String(index + 1)
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={index + 1}
                checked={value === String(index + 1)}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-indigo-600 mt-1"
              />
              <span className="text-slate-900">{choice}</span>
            </div>
          </label>
        ))}
      </div>
    );
  }

  // 단답형
  if (question.type === 'short_answer') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="답안을 입력하세요"
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
      />
    );
  }

  // 서술형
  if (question.type === 'essay') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="답안을 입력하세요"
        rows={8}
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none resize-none"
      />
    );
  }

  // 참/거짓
  if (question.type === 'true_false') {
    return (
      <div className="flex gap-4">
        {['참', '거짓'].map((option, index) => (
          <label
            key={option}
            className={`flex-1 p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${
              value === String(index + 1)
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={index + 1}
              checked={value === String(index + 1)}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <span className="text-lg font-medium text-slate-900">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return null;
}

// ============================================
// 타이머 컴포넌트
// ============================================

function Timer({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const isUrgent = seconds < 300; // 5분 미만

  return (
    <div
      className={`text-lg font-semibold ${
        isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-900'
      }`}
    >
      ⏱️ {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}
