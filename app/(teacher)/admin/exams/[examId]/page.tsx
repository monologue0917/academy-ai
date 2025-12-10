'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  PageHeader,
  AppCard,
  SectionTitle,
  Button,
  Badge,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 시험 상세 페이지
 */

interface ClassItem {
  id: string;
  name: string;
  studentCount: number;
}

interface QuestionItem {
  id: string;
  orderNum: number;
  type: string;
  content: string;
  choices: string[];
  correctAnswer: string;
  explanation: string | null;
  difficultyLevel: number;
  metadata: Record<string, unknown>;
  points: number;
}

interface AssignmentItem {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  className: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface ExamDetailResponse {
  success: boolean;
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    timeLimitMinutes: number;
    totalPoints: number;
    passingScore: number | null;
    instructions: string | null;
    settings: Record<string, unknown>;
    allowRetry: boolean;
    shuffleQuestions: boolean;
    showAnswerAfter: boolean;
    createdAt: string;
    updatedAt: string;
    teacher: {
      id: string;
      name: string;
      email: string;
    } | null;
    status: string;
    className: string;
  };
  questions: QuestionItem[];
  assignments: AssignmentItem[];
  stats: {
    totalAssignments: number;
    completedCount: number;
    submissionRate: string;
    questionCount: number;
  };
}

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params?.examId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<ExamDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 반 선택 관련
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  
  // 삭제 관련
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    fetchExamDetail();
    fetchClasses();
  }, [examId]);

  const fetchExamDetail = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/exams/${examId}`);
      const result = await response.json();

      console.log('[ExamDetail Page] API 응답:', result);

      if (response.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || '데이터 로드 실패');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!user?.academyId) return;
    
    try {
      const response = await fetch(`/api/admin/classes?academyId=${user.academyId}`);
      const result = await response.json();
      
      if (result.success) {
        setClasses(result.classes || []);
      }
    } catch (err) {
      console.error('Classes fetch error:', err);
    }
  };

  // 학생 배정
  const handleAssignToClass = async () => {
    if (!selectedClassId) {
      alert('반을 선택해주세요');
      return;
    }

    setIsAssigning(true);

    try {
      const response = await fetch(`/api/admin/exams/${examId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message || '배정되었습니다');
        setShowClassSelector(false);
        setSelectedClassId('');
        fetchExamDetail();
      } else {
        alert(result.error || '배정 실패');
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('서버 오류가 발생했습니다');
    } finally {
      setIsAssigning(false);
    }
  };

  // 개별 배정 삭제
  const handleDeleteAssignment = async (assignmentId: string, studentName: string) => {
    if (!confirm(`"${studentName}" 학생의 배정을 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingAssignmentId(assignmentId);

    try {
      const response = await fetch(
        `/api/admin/exams/${examId}/assignments?assignmentId=${assignmentId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert('배정이 삭제되었습니다');
        fetchExamDetail();
      } else {
        alert(result.error || '삭제 실패');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('서버 오류가 발생했습니다');
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  // 전체 배정 삭제
  const handleDeleteAllAssignments = async () => {
    if (!confirm('모든 배정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/exams/${examId}/assignments`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert('모든 배정이 삭제되었습니다');
        fetchExamDetail();
      } else {
        alert(result.error || '삭제 실패');
      }
    } catch (err) {
      console.error('Delete all error:', err);
      alert('서버 오류가 발생했습니다');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-600 mb-4">{error || '시험을 찾을 수 없습니다'}</p>
          <Button onClick={() => router.push('/admin/exams')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const { exam, questions, assignments, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title={exam.title}
        description={`${exam.teacher?.name || '선생님'}`}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 시험 정보 */}
        <AppCard>
          <SectionTitle title="시험 정보" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <InfoItem label="제한 시간" value={`${exam.duration || exam.timeLimitMinutes}분`} />
            <InfoItem label="총점" value={`${exam.totalPoints}점`} />
            <InfoItem label="문제 수" value={`${questions.length}문제`} />
            <InfoItem label="합격 점수" value={exam.passingScore ? `${exam.passingScore}점` : '없음'} />
            <InfoItem label="상태" value={<StatusBadge status={exam.status} />} />
            <InfoItem 
              label="생성일" 
              value={new Date(exam.createdAt).toLocaleDateString('ko-KR')} 
            />
          </div>
          {exam.description && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{exam.description}</p>
            </div>
          )}
        </AppCard>

        {/* 학생 배정 섹션 */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="학생 배정" subtitle={`${stats.totalAssignments}명 배정됨`} />
            <div className="flex gap-2">
              {assignments.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={handleDeleteAllAssignments}
                  >
                    전체 삭제
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/admin/exams/${examId}/results`)}
                  >
                    📊 결과 분석
                  </Button>
                </>
              )}
              <Button
                variant="primary"
                onClick={() => setShowClassSelector(true)}
              >
                + 반에 배정하기
              </Button>
            </div>
          </div>

          {/* 반 선택 UI */}
          {showClassSelector && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <h4 className="font-medium text-indigo-900 mb-3">배정할 반 선택</h4>
              
              {classes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  등록된 반이 없습니다. 먼저 반을 만들어주세요.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          selectedClassId === cls.id
                            ? 'border-indigo-500 bg-indigo-100'
                            : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{cls.name}</p>
                        <p className="text-sm text-slate-500">
                          학생 {cls.studentCount}명
                        </p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowClassSelector(false);
                        setSelectedClassId('');
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAssignToClass}
                      disabled={!selectedClassId || isAssigning}
                    >
                      {isAssigning ? '배정 중...' : '선택한 반에 배정'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 배정 현황 */}
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="mb-2">아직 배정된 학생이 없습니다</p>
              <p className="text-sm">위 버튼을 눌러 반을 선택하고 학생들에게 시험을 배정하세요</p>
            </div>
          ) : (
            <>
              {/* 통계 */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                <StatCard label="배정 인원" value={`${stats.totalAssignments}명`} />
                <StatCard label="완료율" value={`${stats.submissionRate}%`} />
                <StatCard label="완료" value={`${stats.completedCount}명`} />
              </div>

              {/* 학생 목록 */}
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <StudentAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onDelete={() => handleDeleteAssignment(
                      assignment.id, 
                      assignment.student?.name || '알 수 없음'
                    )}
                    isDeleting={deletingAssignmentId === assignment.id}
                  />
                ))}
              </div>
            </>
          )}
        </AppCard>

        {/* 문제 목록 */}
        <AppCard>
          <SectionTitle title="문제 목록" subtitle={`총 ${questions.length}문제`} />
          <div className="mt-4 space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                등록된 문제가 없습니다
              </div>
            ) : (
              questions.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))
            )}
          </div>
        </AppCard>
      </div>
    </div>
  );
}

// ============================================
// 하위 컴포넌트
// ============================================

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-indigo-600">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
    draft: 'default',
    published: 'success',
    closed: 'warning',
  };

  const labels: Record<string, string> = {
    draft: '초안',
    published: '공개',
    closed: '마감',
  };

  return (
    <Badge variant={variants[status] || 'success'}>
      {labels[status] || '공개'}
    </Badge>
  );
}

function StudentAssignmentCard({
  assignment,
  onDelete,
  isDeleting,
}: {
  assignment: AssignmentItem;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const statusText: Record<string, string> = {
    scheduled: '예정',
    ongoing: '응시 중',
    completed: '완료',
    cancelled: '취소됨',
  };

  const statusColor: Record<string, string> = {
    scheduled: 'text-slate-600 bg-slate-100',
    ongoing: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100',
  };

  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
          {assignment.student?.name?.[0] || '?'}
        </div>
        <div>
          <p className="font-medium text-slate-900">
            {assignment.student?.name || '알 수 없음'}
          </p>
          <p className="text-sm text-slate-500">
            {assignment.className && (
              <span className="text-indigo-600">{assignment.className} • </span>
            )}
            {assignment.student?.email || '이메일 없음'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 마감일 */}
        <div className="text-right text-sm text-slate-500 hidden md:block">
          <p>마감: {new Date(assignment.endTime).toLocaleDateString('ko-KR')}</p>
        </div>

        {/* 상태 */}
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColor[assignment.status] || statusColor.scheduled
          }`}
        >
          {statusText[assignment.status] || assignment.status}
        </span>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="배정 삭제"
        >
          {isDeleting ? (
            <span className="block w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionItem }) {
  const typeLabels: Record<string, string> = {
    multiple_choice: '객관식',
    short_answer: '단답형',
    essay: '서술형',
    true_false: '참/거짓',
  };

  // choices를 안전하게 문자열 배열로 변환하는 헬퍼 함수
  const getChoiceText = (choice: unknown): string => {
    if (typeof choice === 'string') return choice;
    if (typeof choice === 'number') return String(choice);
    if (typeof choice === 'object' && choice !== null) {
      const obj = choice as Record<string, unknown>;
      return String(obj.text || obj.label || obj.content || obj.value || JSON.stringify(choice));
    }
    return String(choice);
  };

  // choices 배열을 안전하게 처리
  const safeChoices = Array.isArray(question.choices) 
    ? question.choices.map(getChoiceText)
    : [];

  return (
    <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 font-semibold flex items-center justify-center text-sm">
            {question.orderNum}
          </span>
          <div className="flex-1">
            <p className="text-slate-900 line-clamp-2">{String(question.content || '')}</p>
            
            {/* 선택지 표시 */}
            {safeChoices.length > 0 && (
              <div className="mt-2 space-y-1">
                {safeChoices.map((choice, idx) => (
                  <div 
                    key={idx} 
                    className={`text-sm px-2 py-1 rounded ${
                      String(idx + 1) === String(question.correctAnswer)
                        ? 'bg-green-50 text-green-700 font-medium' 
                        : 'text-slate-600'
                    }`}
                  >
                    {choice}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="info">
                {typeLabels[question.type] || String(question.type || 'multiple_choice')}
              </Badge>
              <span className="text-xs text-slate-500">
                정답: {String(question.correctAnswer || '')}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm font-medium text-slate-900">{question.points || 0}점</p>
        </div>
      </div>
    </div>
  );
}
