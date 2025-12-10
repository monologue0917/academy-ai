'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/student/BottomNav';
import { useAuth } from '@/lib/auth';

interface StudentAppLayoutProps {
  children: ReactNode;
}

/**
 * 학생 앱 레이아웃
 * 
 * 기능:
 * - 로그인 체크 (학생만 접근 가능)
 * - 하단 탭바
 * 
 * 디자인:
 * - 전체 배경: bg-slate-50
 * - 컨테이너: max-w-md (480px), 중앙 정렬
 * - 상단 여백: pt-4
 * - 하단 여백: pb-20 (탭바 공간)
 */
export default function StudentAppLayout({ children }: StudentAppLayoutProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  // 인증 체크
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'student') {
        // 선생님이면 선생님 페이지로
        router.push('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 인증 안됨
  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 모바일 최적화 컨테이너 */}
      <main className="mx-auto min-h-screen max-w-md px-4 pb-20 pt-4">
        {children}
      </main>
      
      {/* 하단 탭바 */}
      <BottomNav />
    </div>
  );
}
