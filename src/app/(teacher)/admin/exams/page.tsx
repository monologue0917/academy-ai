'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  AppCard,
  CardHeader,
  CardContent,
  CardFooter,
  StatusBadge,
  Button,
  PlusIcon,
  ClockIcon,
  UsersIcon,
  ClipboardIcon,
  LoadingSpinner,
  Badge,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 모의고사 관리 페이지
 */

interface ExamItem {
  id: string;
  title: string;
  description: string | null;
  className: string;
  classId: string;
  status: string;
  scheduledAt: string | null;
  dueAt: string | null;
  duration: number;
  totalPoints: number;
  questionCount: number;
  completedCount: number;
  totalStudents: number;
  createdAt: string;
}

interface MarkdownExam {
  filename: string;
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  startNumber: number;
  endNumber: number;
}

type TabType = 'my-exams' | 'exam-library';

export default function ExamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('my-exams');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [libraryExams, setLibraryExams] = useState<MarkdownExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.academyId) {
      fetchExams();
      fetchLibraryExams();
    }
  }, [user?.academyId]);

  const fetchExams = async () => {
    if (!user?.academyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/exams?academyId=${user.academyId}&teacherId=${user.id}`
      );
      const data = await response.json();

      if (data.success) {
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error('Exams fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLibraryExams = async () => {
    try {
      const response = await fetch('/api/admin/exams/from-markdown');
      const data = await response.json();
      
      if (data.success) {
        setLibraryExams(data.exams || []);
      }
    } catch (error) {
      console.error('Library exams fetch error:', error);
    }
  };

  const handleImportExam = async (filename: string) => {
    if (isImporting) return;
    
    setIsImporting(filename);
    try {
      const response = await fetch('/api/admin/exams/from-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          scheduledAt: new Date().toISOString(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ 시험이 생성되었습니다!\n\n제목: ${data.title}\n문항수: ${data.questionCount}개`);
        setActiveTab('my-exams');
        fetchExams();
      } else {
        alert(`❌ 시험 생성 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('시험 생성 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(null);
    }
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (isDeleting) return;
    
    const confirmed = window.confirm(`"${examTitle}" 시험을 삭제하시겠습니까?\n\n삭제 후 복구할 수 없습니다.`);
    if (!confirmed) return;
    
    setIsDeleting(examId);
    try {
      const response = await fetch(`/api/admin/exams/${examId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ 시험이 삭제되었습니다.');
        fetchExams();
      } else {
        alert(`❌ 삭제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('시험 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  // 상태 매핑
  const mapStatus = (status: string): 'draft' | 'scheduled' | 'ongoing' | 'completed' => {
    switch (status) {
      case 'draft': return 'draft';
      case 'published': return 'ongoing';
      case 'closed': return 'completed';
      default: return 'draft';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="모의고사 관리"
        description="모의고사를 생성하고 학생들에게 배포하세요"
        actions={
          <Button 
            leftIcon={<PlusIcon size={16} />}
            onClick={() => router.push('/admin/exams/new')}
          >
            새 모의고사
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('my-exams')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'my-exams'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📋 내 시험 ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('exam-library')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'exam-library'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📚 기출문제 DB
          {libraryExams.length > 0 && (
            <Badge variant="info" className="ml-2">{libraryExams.length}</Badge>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'my-exams' ? (
        /* My Exams */
        isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : exams.length === 0 ? (
          <AppCard>
            <div className="text-center py-12">
              <ClipboardIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                아직 생성된 모의고사가 없습니다
              </h3>
              <p className="text-slate-500 mb-6">
                기출문제 DB에서 불러오거나 새로 만들어보세요
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="secondary"
                  onClick={() => setActiveTab('exam-library')}
                >
                  📚 기출문제 불러오기
                </Button>
                <Button 
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => router.push('/admin/exams/new')}
                >
                  새로 만들기
                </Button>
              </div>
            </div>
          </AppCard>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <AppCard key={exam.id} hover>
                <CardHeader 
                  title={exam.title}
                  subtitle={exam.description || '설명 없음'}
                  badge={<StatusBadge status={mapStatus(exam.status)} />}
                />

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">대상 반</p>
                      <p className="font-medium text-slate-900">{exam.className || '미지정'}</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">마감일</p>
                      <p className="font-medium text-slate-900">
                        {exam.dueAt 
                          ? new Date(exam.dueAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '미정'
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">배점 / 시간</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {exam.totalPoints}점
                        </span>
                        <span className="text-slate-400">•</span>
                        <div className="flex items-center gap-1">
                          <ClockIcon size={12} className="text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {exam.duration}분
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">제출 현황</p>
                      <div className="flex items-center gap-1">
                        <UsersIcon size={12} className="text-slate-400" />
                        <span className="font-medium text-slate-900">
                          {exam.totalStudents > 0 
                            ? `${exam.completedCount}/${exam.totalStudents}`
                            : '미배정'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => router.push(`/admin/exams/${exam.id}`)}
                    >
                      상세 보기
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      disabled={isDeleting === exam.id}
                    >
                      {isDeleting === exam.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        '삭제'
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </AppCard>
            ))}
          </div>
        )
      ) : (
        /* Exam Library */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>기출문제 DB</strong>에서 시험을 선택하면 바로 학생들에게 배정할 수 있습니다.
              정답과 배점이 모두 포함되어 있어요!
            </p>
          </div>

          {libraryExams.length === 0 ? (
            <AppCard>
              <div className="text-center py-12">
                <p className="text-slate-500">등록된 기출문제가 없습니다.</p>
              </div>
            </AppCard>
          ) : (
            <div className="space-y-3">
              {libraryExams.map((exam) => (
                <AppCard key={exam.filename}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">
                            {exam.title}
                          </h3>
                          <Badge variant="success">{exam.subject}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">
                          {exam.startNumber}번 ~ {exam.endNumber}번 • 총 {exam.totalQuestions}문항
                        </p>
                      </div>
                      
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleImportExam(exam.filename)}
                        disabled={isImporting !== null}
                      >
                        {isImporting === exam.filename ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            생성 중...
                          </>
                        ) : (
                          '시험 생성'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </AppCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
