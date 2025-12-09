'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PageHeader, 
  StatCard, 
  SectionTitle, 
  AppCard,
  CardHeader,
  CardContent,
  StatusBadge,
  UsersIcon,
  ClipboardIcon,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 대시보드 메인 페이지
 * 
 * 구성:
 * 1. PageHeader
 * 2. 통계 카드 3개 (반 수, 학생 수, 미채점)
 * 3. 최근 모의고사 섹션
 */

interface DashboardStats {
  classCount: number;
  studentCount: number;
  pendingCount: number;
}

interface RecentExam {
  id: string;
  title: string;
  className: string;
  status: string;
  averageScore: number;
  completedCount: number;
  totalStudents: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats>({
    classCount: 0,
    studentCount: 0,
    pendingCount: 0,
  });
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.academyId) {
      fetchDashboardData();
    }
  }, [user?.academyId]);

  const fetchDashboardData = async () => {
    if (!user?.academyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/dashboard?academyId=${user.academyId}&teacherId=${user.id}`
      );
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setRecentExams(data.recentExams || []);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="대시보드"
          description="학원 전체 현황을 한눈에 확인하세요"
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="대시보드"
        description="학원 전체 현황을 한눈에 확인하세요"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="전체 반"
          value={`${stats.classCount}개`}
          icon={<UsersIcon className="text-indigo-500" size={20} />}
        />

        <StatCard 
          label="전체 학생"
          value={`${stats.studentCount}명`}
          icon={<UsersIcon className="text-emerald-500" size={20} />}
        />

        <StatCard 
          label="미채점 과제"
          value={`${stats.pendingCount}개`}
          icon={<ClipboardIcon className="text-amber-500" size={20} />}
        />
      </div>

      {/* Recent Exams Section */}
      <section className="space-y-3">
        <SectionTitle 
          title="최근 모의고사"
          subtitle={recentExams.length > 0 
            ? `${recentExams.length}개의 시험이 있습니다`
            : '아직 생성된 시험이 없습니다'
          }
        />

        {recentExams.length === 0 ? (
          <AppCard>
            <div className="text-center py-8">
              <ClipboardIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">아직 생성된 시험이 없습니다</p>
              <button
                onClick={() => router.push('/admin/exams/new')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                첫 시험 만들기
              </button>
            </div>
          </AppCard>
        ) : (
          <div className="space-y-3">
            {recentExams.map((exam) => (
              <AppCard 
                key={exam.id} 
                hover 
                onClick={() => router.push(`/admin/exams/${exam.id}`)}
              >
                <CardHeader 
                  title={exam.title}
                  subtitle={exam.className}
                  badge={<StatusBadge status={mapStatus(exam.status)} />}
                />

                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">평균 점수</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {exam.averageScore > 0 ? `${exam.averageScore}점` : '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">완료율</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {exam.totalStudents > 0 
                          ? `${Math.round((exam.completedCount / exam.totalStudents) * 100)}%`
                          : '-'
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">제출</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {exam.totalStudents > 0 
                          ? `${exam.completedCount}/${exam.totalStudents}`
                          : '미배정'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </AppCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// 상태 매핑 함수
function mapStatus(status: string): 'draft' | 'scheduled' | 'ongoing' | 'completed' {
  switch (status) {
    case 'draft': return 'draft';
    case 'published': return 'ongoing';
    case 'closed': return 'completed';
    default: return 'draft';
  }
}
