interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

/**
 * LoadingSpinner - 로딩 인디케이터
 * 
 * @example
 * <LoadingSpinner size="md" text="로딩중..." />
 */
export function LoadingSpinner({ 
  size = 'md', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizeStyles[size]}
          border-slate-200 border-t-indigo-600
          rounded-full animate-spin
        `}
      />
      {text && (
        <p className="text-sm text-slate-600">
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * LoadingOverlay - 전체 화면 로딩 오버레이
 * 
 * @example
 * <LoadingOverlay text="데이터를 불러오는 중..." />
 */
export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg px-6 py-8">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}
