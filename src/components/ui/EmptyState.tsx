import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState - 데이터가 없을 때 표시하는 컴포넌트
 * 
 * @example
 * <EmptyState 
 *   icon={<ClipboardIcon size={48} className="text-slate-300" />}
 *   title="아직 모의고사가 없습니다"
 *   description="첫 모의고사를 만들어 학생들에게 배포해보세요"
 *   action={
 *     <Button leftIcon={<PlusIcon />}>
 *       모의고사 만들기
 *     </Button>
 *   }
 * />
 */
export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-slate-500 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
