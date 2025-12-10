'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/**
 * 학생 홈 화면
 * 
 * 구성:
 * 1. 상단 프로필 + 인사말
 * 2. 오늘의 할 일 (시험/숙제)
 * 3. 복습 추천
 */

interface ExamItem {
  id: string;
  assignmentId: string;
  title: string;
  className: string;
  duration: number;
  totalPoints: number;
  scheduledAt: string | null;
  dueAt: string | null;
  status: string;
  isStarted: boolean;
  startedAt: string | null;
}

interface HomeworkItem {
  id: string;
  assignmentId: string;
  title: string;
  className: string;
  dueAt: string | null;
  status: string;
}

interface ReviewStats {
  totalWrong: number;
  reviewedToday: number;
  todayLimit: number;
}

export default function StudentHomePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [todayExams, setTodayExams] = useState<ExamItem[]>([]);
  const [todayHomeworks, setTodayHomeworks] = useState<HomeworkItem[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalWrong: 0,
    reviewedToday: 0,
    todayLimit: 10,
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchHomeData();
    }
  }, [user?.id]);

  const fetchHomeData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/student/home?studentId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setTodayExams(data.todayExams || []);
        setTodayHomeworks(data.todayHomeworks || []);
        setReviewStats(data.reviewStats || {
          totalWrong: 0,
          reviewedToday: 0,
          todayLimit: 10,
        });
      }
    } catch (error) {
      console.error('Home data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 시간대별 인사말
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* 상단 프로필 영역 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{getGreeting()} 👋</p>
          <h1 className="text-xl font-bold text-slate-900">
            {user?.name || '학생'}님
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.academyName} {user?.classes?.[0]?.name && `• ${user.classes[0].name}`}
          </p>
        </div>

        {/* 프로필 아바타 */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold hover:bg-indigo-200 transition-colors"
          >
            {user?.name?.charAt(0) || '?'}
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.academyName}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 오늘의 할 일 섹션 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          오늘의 할 일
        </h2>

        {todayExams.length === 0 && todayHomeworks.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-slate-600">오늘 할 일이 없어요!</p>
            <p className="text-sm text-slate-500 mt-1">복습을 해보는 건 어떨까요?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 시험 카드들 */}
            {todayExams.map((exam) => (
              <ExamCard 
                key={exam.id} 
                exam={exam} 
                onClick={() => router.push(`/app/exams/${exam.id}`)}
              />
            ))}

            {/* 숙제 카드들 */}
            {todayHomeworks.map((homework) => (
              <HomeworkCard 
                key={homework.id} 
                homework={homework}
                onClick={() => router.push(`/app/homeworks/${homework.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 복습 추천 섹션 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          복습 추천
        </h2>

        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/app/wrong-notes')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">오늘의 오답 복습</h3>
              <p className="text-indigo-100 text-sm mt-1">
                {reviewStats.totalWrong > 0 
                  ? `${reviewStats.totalWrong}개의 오답이 기다리고 있어요`
                  : '아직 오답이 없어요 👍'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {reviewStats.totalWrong}
              </p>
              <p className="text-xs text-indigo-200">문제</p>
            </div>
          </div>

          {reviewStats.reviewedToday > 0 && (
            <div className="mt-3 pt-3 border-t border-indigo-400/30">
              <p className="text-xs text-indigo-200">
                오늘 {reviewStats.reviewedToday}문제 복습 완료!
              </p>
            </div>
          )}
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-3">
          <QuickMenuCard
            icon="📝"
            title="전체 시험"
            subtitle="모의고사 보기"
            onClick={() => router.push('/app/exams')}
          />
          <QuickMenuCard
            icon="📚"
            title="오답노트"
            subtitle="틀린 문제 모음"
            onClick={() => router.push('/app/wrong-notes')}
          />
        </div>
      </section>
    </div>
  );
}

// 시험 카드 컴포넌트
function ExamCard({ exam, onClick }: { exam: ExamItem; onClick: () => void }) {
  const getDueText = () => {
    if (!exam.dueAt) return '';
    const due = new Date(exam.dueAt);
    const now = new Date();
    const diffHours = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return '마감됨';
    if (diffHours < 1) return '곧 마감';
    if (diffHours < 24) return `${diffHours}시간 남음`;
    return `${Math.floor(diffHours / 24)}일 남음`;
  };

  return (
    <div 
      className="bg-white rounded-2xl p-4 border-2 border-indigo-200 hover:border-indigo-400 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            모의고사
          </span>
          {exam.isStarted && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              진행 중
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{getDueText()}</span>
      </div>

      <h3 className="font-semibold text-slate-900 mb-1">{exam.title}</h3>
      <p className="text-sm text-slate-500">{exam.className}</p>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span>⏱ {exam.duration}분</span>
        <span>📊 {exam.totalPoints}점</span>
      </div>
    </div>
  );
}

// 숙제 카드 컴포넌트
function HomeworkCard({ homework, onClick }: { homework: HomeworkItem; onClick: () => void }) {
  const getDueText = () => {
    if (!homework.dueAt) return '';
    const due = new Date(homework.dueAt);
    const now = new Date();
    const diffHours = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return '마감됨';
    if (diffHours < 1) return '곧 마감';
    if (diffHours < 24) return `${diffHours}시간 남음`;
    return `${Math.floor(diffHours / 24)}일 남음`;
  };

  return (
    <div 
      className="bg-white rounded-2xl p-4 border-2 border-emerald-200 hover:border-emerald-400 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            숙제
          </span>
        </div>
        <span className="text-xs text-slate-500">{getDueText()}</span>
      </div>

      <h3 className="font-semibold text-slate-900 mb-1">{homework.title}</h3>
      <p className="text-sm text-slate-500">{homework.className}</p>
    </div>
  );
}

// 빠른 메뉴 카드
function QuickMenuCard({ icon, title, subtitle, onClick }: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <div 
      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <span className="text-2xl">{icon}</span>
      <h4 className="font-medium text-slate-900 mt-2">{title}</h4>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
