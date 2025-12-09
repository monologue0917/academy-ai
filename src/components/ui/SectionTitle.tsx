import { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * SectionTitle - 페이지 내 섹션 헤더
 * 
 * 디자인 가이드:
 * - title: text-sm font-semibold text-slate-900
 * - subtitle: text-xs text-slate-500
 * 
 * @example
 * <SectionTitle 
 *   title="오늘의 할 일" 
 *   subtitle="마감이 임박한 과제가 있어요"
 *   action={<Button variant="ghost" size="sm">전체보기</Button>}
 * />
 */
export function SectionTitle({ 
  title, 
  subtitle, 
  action,
  className = '' 
}: SectionTitleProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}
