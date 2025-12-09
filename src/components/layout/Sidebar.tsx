'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  BarChart3,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/admin',
  },
  {
    icon: Users,
    label: '반 관리',
    href: '/admin/classes',
  },
  {
    icon: FileText,
    label: '모의고사',
    href: '/admin/exams',
  },
  {
    icon: BookOpen,
    label: '숙제',
    href: '/admin/homeworks',
  },
  {
    icon: BarChart3,
    label: '결과/분석',
    href: '/admin/results',
  },
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
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
          fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-gray-900">ACE ENGLISH</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl
                  transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-indigo-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              도움이 필요하신가요?
            </h3>
            <p className="text-gray-600 text-xs mb-3">
              사용 가이드를 확인하세요
            </p>
            <button className="w-full bg-white text-indigo-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              가이드 보기
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
