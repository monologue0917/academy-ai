'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 시험 결과 분석 페이지 (선생님용)
 */

interface StudentResult {
  studentId: string;
  studentName: string;
  studentNumber: string;
  status: string;
  score: number | null;
  maxScore: number;
  percentage: number;
  correctCount: number;
  totalCount: number;
  submittedAt: string | null;
}

interface QuestionStat {
  questionId: string;
  orderNum: number;
  points: number;
  content: string;
  correctAnswer: string;
  correctRate: number;
  answerDistribution: Record<string, number>;
}

interface ExamResultsData {
  exam: {
    id: string;
    title: string;
    description: string;
    totalPoints: number;
    questionCount: number;
  };
  stats: {
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
  };
  studentResults: StudentResult[];
  questionStats: QuestionStat[];
  hardQuestions: QuestionStat[];
}

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ExamResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'questions'>('students');

  useEffect(() => {
    fetchResults();
  }, [examId]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/exams/${examId}/results`);
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || '결과를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('[Results] Error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">결과 분석 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 mb-4">{error || '데이터를 불러올 수 없습니다'}</p>
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:underline"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  const { exam, stats, studentResults, questionStats, hardQuestions } = data;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/exams"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← 시험 목록
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
          <p className="text-slate-600">결과 분석</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="응시율"
          value={`${stats.completionRate}%`}
          sub={`${stats.totalCompleted}/${stats.totalAssigned}명`}
          color="indigo"
        />
        <StatCard
          label="평균 점수"
          value={`${stats.avgScore}점`}
          sub={`만점 ${exam.totalPoints}점`}
          color="blue"
        />
        <StatCard
          label="최고 점수"
          value={`${stats.highestScore}점`}
          color="green"
        />
        <StatCard
          label="최저 점수"
          value={`${stats.lowestScore}점`}
          color="rose"
        />
      </div>

      {/* 어려운 문제 TOP 5 */}
      {hardQuestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-3">⚠️ 정답률 낮은 문제 TOP 5</h3>
          <div className="space-y-2">
            {hardQuestions.map((q, i) => (
              <div
                key={q.questionId}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="text-slate-700">
                    {q.orderNum}번 문제
                  </span>
                </div>
                <span className={`font-semibold ${
                  q.correctRate < 30 ? 'text-rose-600' :
                  q.correctRate < 50 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  정답률 {q.correctRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'students'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            학생별 결과 ({studentResults.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'questions'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            문항별 분석 ({questionStats.length})
          </button>
        </div>
      </div>

      {/* 학생별 결과 */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">순위</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">학생</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">상태</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">점수</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">정답</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">제출일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentResults.map((student, index) => (
                <tr key={student.studentId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {student.status === 'completed' && (
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-slate-200 text-slate-600' :
                        index === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{student.studentName}</p>
                      {student.studentNumber && (
                        <p className="text-sm text-slate-500">{student.studentNumber}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.score !== null ? (
                      <div>
                        <span className="font-semibold text-slate-900">{student.score}</span>
                        <span className="text-slate-400">/{student.maxScore}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.status === 'completed' ? (
                      <span className="text-slate-600">
                        {student.correctCount}/{student.totalCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-500">
                    {student.submittedAt
                      ? new Date(student.submittedAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {studentResults.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              배정된 학생이 없습니다
            </div>
          )}
        </div>
      )}

      {/* 문항별 분석 */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questionStats.map((q) => (
            <QuestionStatCard key={q.questionId} question={q} />
          ))}

          {questionStats.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              문제가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'indigo' | 'blue' | 'green' | 'rose';
}) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    rose: 'bg-rose-50 border-rose-200',
  };

  const textColors = {
    indigo: 'text-indigo-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    rose: 'text-rose-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: '완료', className: 'bg-green-100 text-green-700' },
    ongoing: { label: '진행중', className: 'bg-blue-100 text-blue-700' },
    scheduled: { label: '대기', className: 'bg-slate-100 text-slate-600' },
    cancelled: { label: '취소', className: 'bg-rose-100 text-rose-700' },
  };

  const result = config[status] ?? config.scheduled!;
  const { label, className } = result;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// 문항 통계 카드 컴포넌트
function QuestionStatCard({ question }: { question: QuestionStat }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600 bg-green-100';
    if (rate >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-rose-600 bg-rose-100';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-semibold">
            {question.orderNum}
          </span>
          <div>
            <p className="text-slate-900 font-medium line-clamp-1">
              {question.content || `${question.orderNum}번 문제`}
            </p>
            <p className="text-sm text-slate-500">
              배점 {question.points}점 · 정답 {question.correctAnswer}번
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full font-semibold ${getRateColor(question.correctRate)}`}>
            {question.correctRate}%
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 오답 분포 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-600 mb-3">답안 분포</p>
          <div className="grid grid-cols-5 gap-2">
            {['1', '2', '3', '4', '5'].map((num) => {
              const count = question.answerDistribution[num] || 0;
              const isCorrect = num === question.correctAnswer;
              const total = Object.values(question.answerDistribution).reduce((a, b) => a + b, 0);
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div
                  key={num}
                  className={`text-center p-3 rounded-lg ${
                    isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50'
                  }`}
                >
                  <p className={`text-lg font-bold ${isCorrect ? 'text-green-600' : 'text-slate-700'}`}>
                    {num}번
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-sm text-slate-500">{percent}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
