'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmptyState,
  ClipboardIcon,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 학생용 모의고사 목록 페이지
 */

interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  totalPoints: number;
  duration: number;
  timeLimitMinutes: number;
  passingScore: number | null;
  questionCount: number;
  
  // 배정 정보
  assignmentId: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  assignedAt: string;
  
  // 제출 정보
  submissionId: string | null;
  score: number | null;
  completedAt: string | null;
  
  // 상태 판단
  isExpired: boolean;
  canStart: boolean;
}

interface ExamsResponse {
  success: boolean;
  exams: ExamListItem[];
  count: number;
  error?: string;
}

export default function ExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchExams();
    }
  }, [user?.id]);

  const fetchExams = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/student/exams?studentId=${user.id}`);
      const data: ExamsResponse = await response.json();

      console.log('[Student Exams Page] 응답:', data);

      if (response.ok && data.success) {
        setExams(data.exams || []);
      } else {
        setError(data.error || '시험 목록을 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            모의고사
          </h1>
          <p className="text-sm text-slate-600">
            선생님이 배정한 모의고사를 확인하세요
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-sm text-slate-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            모의고사
          </h1>
          <p className="text-sm text-slate-600">
            선생님이 배정한 모의고사를 확인하세요
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <p className="text-sm text-rose-700 mb-3">{error}</p>
          <button
            onClick={fetchExams}
            className="text-sm text-rose-600 font-medium hover:text-rose-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (exams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            모의고사
          </h1>
          <p className="text-sm text-slate-600">
            선생님이 배정한 모의고사를 확인하세요
          </p>
        </div>

        <EmptyState 
          icon={<ClipboardIcon size={48} className="text-slate-300" />}
          title="아직 배정된 모의고사가 없습니다"
          description="선생님이 모의고사를 배정하면 여기에 표시됩니다"
        />
      </div>
    );
  }

  // 시험 목록
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          모의고사
        </h1>
        <p className="text-sm text-slate-600">
          총 {exams.length}개의 모의고사가 배정되었습니다
        </p>
      </div>

      {/* 시험 목록 */}
      <div className="space-y-4">
        {exams.map((exam) => (
          <ExamCard key={exam.assignmentId} exam={exam} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// ExamCard 컴포넌트
// ============================================

function ExamCard({ exam }: { exam: ExamListItem }) {
  const router = useRouter();

  const statusText: Record<string, string> = {
    scheduled: '진행 전',
    ongoing: '응시 중',
    completed: '완료',
    cancelled: '취소됨',
  };

  const statusColor: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-700',
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-slate-100 text-slate-500',
  };

  // 버튼 텍스트 & 액션
  const getActionButton = () => {
    if (exam.isExpired && exam.status !== 'completed') {
      return {
        text: '마감됨',
        onClick: () => {},
        variant: 'disabled' as const,
        disabled: true,
      };
    }

    switch (exam.status) {
      case 'scheduled':
        return {
          text: '시험 시작하기',
          onClick: () => router.push(`/app/exams/${exam.id}`),
          variant: 'primary' as const,
          disabled: false,
        };
      case 'ongoing':
        return {
          text: '이어서 풀기',
          onClick: () => router.push(`/app/exams/${exam.id}/take`),
          variant: 'primary' as const,
          disabled: false,
        };
      case 'completed':
        return {
          text: '결과 확인하기',
          onClick: () => router.push(`/app/exams/${exam.id}/result`),
          variant: 'secondary' as const,
          disabled: false,
        };
      case 'cancelled':
        return {
          text: '취소된 시험',
          onClick: () => {},
          variant: 'disabled' as const,
          disabled: true,
        };
      default:
        return null;
    }
  };

  const action = getActionButton();

  // D-Day 계산
  const getDday = () => {
    if (!exam.endTime) return null;
    const now = new Date();
    const due = new Date(exam.endTime);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return '마감';
    if (diff === 0) return 'D-Day';
    return `D-${diff}`;
  };

  const dday = getDday();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더: 제목 + 상태 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {exam.title}
          </h3>
          {exam.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {exam.description}
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusColor[exam.status] || statusColor.scheduled
            }`}
          >
            {statusText[exam.status] || exam.status}
          </span>
          {dday && exam.status !== 'completed' && (
            <span className={`text-xs font-medium ${
              dday === '마감' ? 'text-slate-400' : 'text-rose-600'
            }`}>
              {dday}
            </span>
          )}
        </div>
      </div>

      {/* 시험 정보 */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <span>📝</span>
          <span>{exam.questionCount}문제</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span>⏱️</span>
          <span>{exam.duration || exam.timeLimitMinutes}분</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span>🎯</span>
          <span>총 {exam.totalPoints}점</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span>📅</span>
          <span>~{formatDate(exam.endTime)}</span>
        </div>
        {exam.score !== null && (
          <div className="col-span-2 flex items-center gap-2 font-medium text-indigo-600">
            <span>✓</span>
            <span>
              내 점수: {exam.score}점 / {exam.totalPoints}점
            </span>
          </div>
        )}
      </div>

      {/* 버튼 */}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            action.variant === 'primary'
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : action.variant === 'secondary'
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {action.text}
        </button>
      )}
    </div>
  );
}

// ============================================
// 유틸리티 함수
// ============================================

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}
