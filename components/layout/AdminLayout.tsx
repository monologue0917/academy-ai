'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import { useAuth } from '@/lib/auth';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * AdminLayout - 선생님 대시보드 전체 레이아웃
 * 
 * 기능:
 * - 로그인 체크 (선생님만 접근 가능)
 * 
 * 구조:
 * - 좌측: AdminSidebar (어두운 테마)
 * - 우측: AdminTopBar + Main Content
 * - Main: max-w-6xl 중앙 정렬, bg-slate-50
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 인증 체크
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'teacher') {
        // 학생이면 학생 페이지로
        router.push('/app');
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
  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300
          ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}
        `}
      >
        {/* Top Bar */}
        <AdminTopBar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
