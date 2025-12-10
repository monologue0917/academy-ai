'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 시험 시작 화면
 * 
 * 기능:
 * 1. 시험 정보 표시
 * 2. "시험 시작하기" 버튼
 * 3. 주의사항 안내
 */

interface ExamData {
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    timeLimitMinutes: number;
    totalPoints: number;
    instructions: string | null;
  };
  assignment: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
  };
  questions: Array<{
    id: string;
    orderNum: number;
    type: string;
    content: string;
    choices: string[];
    points: number;
  }>;
  questionCount: number;
}

export default function ExamStartPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params?.examId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchExamInfo();
    }
  }, [user?.id, examId]);

  const fetchExamInfo = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      console.log('[ExamStart] Fetching exam info:', examId, 'studentId:', user.id);
      
      const response = await fetch(
        `/api/student/exams/${examId}/questions?studentId=${user.id}`
      );
      const data = await response.json();

      console.log('[ExamStart] Response:', data);

      if (response.ok && data.success) {
        setExamData(data);
      } else {
        setError(data.error || '시험 정보를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('[ExamStart] Error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!user?.id) return;

    if (!confirm('시험을 시작하시겠습니까? 시작하면 제한 시간이 시작됩니다.')) {
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch(
        `/api/student/exams/${examId}/start`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: user.id }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // 응시 화면으로 이동
        router.push(`/app/exams/${examId}/take`);
      } else {
        alert(data.error || '시험 시작 실패');
        setIsStarting(false);
      }
    } catch (err) {
      console.error('[ExamStart] Start error:', err);
      alert('서버 오류가 발생했습니다');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <p className="text-rose-600 mb-4">{error || '시험을 찾을 수 없습니다'}</p>
          <Button onClick={() => router.push('/app/exams')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const { exam, assignment, questionCount } = examData;

  // 마감일 계산
  const endDate = new Date(assignment.endTime);
  const isExpired = endDate < new Date();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
        {exam.description && (
          <p className="text-slate-600">{exam.description}</p>
        )}
      </div>

      {/* 시험 정보 카드 */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="font-semibold text-slate-900 mb-4">시험 정보</h2>
        <div className="space-y-3">
          <InfoRow label="문제 수" value={`${questionCount}문제`} />
          <InfoRow label="제한 시간" value={`${exam.duration || exam.timeLimitMinutes}분`} />
          <InfoRow label="총점" value={`${exam.totalPoints}점`} />
          <InfoRow 
            label="마감일" 
            value={endDate.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })} 
          />
        </div>
      </div>

      {/* 주의사항 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-semibold text-amber-900 mb-3">⚠️ 주의사항</h2>
        <ul className="space-y-2 text-sm text-amber-800">
          <li>• 시험 시작 후 제한 시간이 자동으로 시작됩니다</li>
          <li>• 중간에 나가도 시간은 계속 흐릅니다</li>
          <li>• 제출 후에는 수정할 수 없습니다</li>
          <li>• 인터넷 연결을 확인하세요</li>
        </ul>
      </div>

      {/* 지침 (있으면) */}
      {exam.instructions && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-3">📋 시험 안내</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {exam.instructions}
          </p>
        </div>
      )}

      {/* 시작 버튼 */}
      {isExpired ? (
        <div className="bg-slate-100 rounded-xl py-4 text-center text-slate-500 font-medium">
          시험 기간이 종료되었습니다
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={handleStart}
          disabled={isStarting}
          fullWidth
          className="py-4 text-lg"
        >
          {isStarting ? '시작 중...' : '시험 시작하기'}
        </Button>
      )}

      {/* 취소 버튼 */}
      <button
        onClick={() => router.push('/app/exams')}
        className="w-full py-3 text-slate-600 hover:text-slate-900 transition-colors"
      >
        취소
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
