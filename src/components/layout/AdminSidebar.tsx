'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboardIcon,
  UsersIcon,
  ClipboardIcon,
  BookOpenIcon,
  BarChartIcon,
  XIcon,
} from '@/components/ui/Icons';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboardIcon,
    label: 'Dashboard',
    href: '/admin',
  },
  {
    icon: UsersIcon,
    label: '반 관리',
    href: '/admin/classes',
  },
  {
    icon: ClipboardIcon,
    label: '모의고사',
    href: '/admin/exams',
  },
  {
    icon: BookOpenIcon,
    label: '숙제',
    href: '/admin/homeworks',
  },
  {
    icon: BarChartIcon,
    label: '결과/분석',
    href: '/admin/results',
  },
];

/**
 * AdminSidebar - 선생님 대시보드 사이드바
 * 
 * 디자인:
 * - bg-slate-950 (어두운 테마)
 * - text-slate-300 (기본)
 * - active: bg-slate-800, text-white
 * - hover: bg-slate-900
 */
export default function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64
          bg-slate-950 shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Header - Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-tight">
                AI 학원
              </span>
              <span className="text-slate-400 text-xs">
                대시보드
              </span>
            </div>
          </div>
          
          {/* Close button (mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XIcon className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }
                `}
              >
                <Icon
                  className={isActive ? 'text-white' : 'text-slate-400'}
                  size={20}
                />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="bg-slate-900 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-2">
              © 2024 AI 학원 관리 시스템
            </p>
            <p className="text-slate-500 text-xs">
              v1.0.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
