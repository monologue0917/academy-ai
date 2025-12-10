import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

const trendStyles = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-slate-600',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

/**
 * StatCard - 통계 카드 (선생님 대시보드용)
 * 
 * @example
 * <StatCard 
 *   label="완료한 학생"
 *   value="24/30"
 *   icon={<CheckCircleIcon className="text-emerald-500" />}
 *   trend="up"
 *   trendValue="+5명"
 * />
 */
export function StatCard({ 
  label, 
  value, 
  icon,
  trend,
  trendValue,
  className = '' 
}: StatCardProps) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-sm border border-slate-100
      px-4 py-4
      ${className}
    `}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-slate-600">
          {label}
        </p>
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-900 tracking-tight">
          {value}
        </p>
        
        {trend && trendValue && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendStyles[trend]}`}>
            <span>{trendIcons[trend]}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
