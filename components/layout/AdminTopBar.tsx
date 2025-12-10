'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuIcon, ChevronDownIcon } from '@/components/ui/Icons';
import { useAuth } from '@/lib/auth';

interface AdminTopBarProps {
  toggleSidebar: () => void;
}

/**
 * AdminTopBar - 선생님 대시보드 상단 바
 * 
 * 디자인:
 * - 높이: 64px
 * - 배경: white
 * - 하단 border
 * - 왼쪽: 학원 이름
 * - 오른쪽: 선생님 이름 + 드롭다운 + 로그아웃
 */
export default function AdminTopBar({ toggleSidebar }: AdminTopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MenuIcon className="text-slate-600" size={20} />
          </button>

          {/* Academy Name */}
          <h1 className="text-sm font-semibold text-slate-900">
            {user?.academyName || '학원'}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || '?'}
                </span>
              </div>

              {/* Name & Role */}
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {user?.name || '선생님'}
                </p>
                <p className="text-xs text-slate-500">
                  선생님
                </p>
              </div>

              {/* Dropdown Arrow */}
              <ChevronDownIcon className="text-slate-400" size={16} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email || user?.academyName}</p>
                  </div>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    프로필 설정
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
