'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  ClipboardIcon,
  BookOpenIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const tabs: TabItem[] = [
  { href: '/app', label: '홈', icon: LayoutDashboardIcon },
  { href: '/app/exams', label: '모의고사', icon: ClipboardIcon },
  { href: '/app/homeworks', label: '숙제', icon: BookOpenIcon },
  { href: '/app/wrong-notes', label: '오답', icon: AlertCircleIcon },
];

/**
 * BottomNav - 학생 앱 하단 탭바
 * 
 * 디자인:
 * - fixed bottom-0
 * - bg-white with border-top
 * - max-w-md 중앙 정렬
 * - active: text-indigo-600
 * - inactive: text-slate-400
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                transition-all duration-200
                ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <Icon 
                className={`${isActive ? 'scale-110' : ''} transition-transform`}
                size={24}
              />
              <span className="text-[10px] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
