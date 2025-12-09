'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean; // hover 효과 명시적 제어
}

/**
 * AppCard - 앱 전체에서 사용하는 기본 카드 컴포넌트
 * 
 * 디자인 가이드:
 * - bg-white
 * - rounded-2xl
 * - shadow-sm
 * - border border-slate-100
 * - px-4 py-3
 * 
 * @example
 * <AppCard>
 *   <CardHeader title="시험 제목" subtitle="2024-12-08" />
 *   <div>카드 내용</div>
 * </AppCard>
 * 
 * @example
 * <AppCard onClick={() => {}} hover>
 *   클릭 가능한 카드
 * </AppCard>
 */
export function AppCard({ 
  children, 
  className = '', 
  onClick,
  hover = false 
}: CardProps) {
  const isClickable = !!onClick || hover;
  
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-slate-100
        px-4 py-3
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all duration-200' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

/**
 * CardHeader - 카드 헤더 (제목 + 서브타이틀 + 액션)
 * 
 * @example
 * <CardHeader 
 *   title="수능특강 1회 모의고사" 
 *   subtitle="2024-12-08 마감"
 *   badge={<StatusBadge status="ongoing" />}
 *   action={<Button size="sm">시작</Button>}
 * />
 */
export function CardHeader({ title, subtitle, action, badge }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 tracking-tight truncate">
            {title}
          </h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-3 flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardContent - 카드 본문
 */
export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-sm text-slate-700 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardFooter - 카드 푸터 (액션 버튼 등)
 */
export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

// 기존 Card export (하위 호환성)
export const Card = AppCard;
