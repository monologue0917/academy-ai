/**
 * StatusBadge - 시험/숙제 상태를 표시하는 배지
 * 
 * 디자인 가이드:
 * - scheduled: 회색 (예정됨)
 * - ongoing: 인디고 (진행중)
 * - completed: 에메랄드 (완료)
 * - graded: 에메랄드 진한색 (채점완료)
 * - overdue: 로즈/레드 (마감 지남)
 * - due-soon: 앰버 (마감 임박)
 */

export type StatusType = 
  | 'scheduled'   // 예정됨
  | 'ongoing'     // 진행중
  | 'completed'   // 완료
  | 'graded'      // 채점완료
  | 'overdue'     // 마감 지남
  | 'due-soon'    // 마감 임박
  | 'draft'       // 초안
  | 'published'   // 게시됨
  | 'closed';     // 종료됨

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string }> = {
  scheduled: {
    label: '예정',
    color: 'bg-slate-100 text-slate-700',
  },
  ongoing: {
    label: '진행중',
    color: 'bg-indigo-100 text-indigo-700',
  },
  completed: {
    label: '완료',
    color: 'bg-emerald-100 text-emerald-700',
  },
  graded: {
    label: '채점완료',
    color: 'bg-emerald-100 text-emerald-800',
  },
  overdue: {
    label: '마감',
    color: 'bg-rose-100 text-rose-700',
  },
  'due-soon': {
    label: '마감임박',
    color: 'bg-amber-100 text-amber-700',
  },
  draft: {
    label: '초안',
    color: 'bg-slate-100 text-slate-600',
  },
  published: {
    label: '게시됨',
    color: 'bg-indigo-100 text-indigo-700',
  },
  closed: {
    label: '종료',
    color: 'bg-slate-200 text-slate-700',
  },
};

/**
 * @example
 * <StatusBadge status="ongoing" />
 * <StatusBadge status="overdue" />
 * <StatusBadge status="completed" />
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-2 py-0.5
        text-xs font-medium
        rounded-full
        ${config.color}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}

// 기존 Badge 컴포넌트도 유지 (범용)
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-indigo-100 text-indigo-700',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

/**
 * Badge - 범용 배지 컴포넌트
 * 
 * @example
 * <Badge variant="success">+5점</Badge>
 * <Badge variant="warning" size="md">주의</Badge>
 */
export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className = '' 
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
