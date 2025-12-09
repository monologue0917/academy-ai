import {
  EmptyState,
  BookOpenIcon,
} from '@/components/ui';

/**
 * 숙제 목록 페이지
 * 
 * 현재: 빈 상태
 * 추후: 배정된 숙제 목록 표시
 */
export default function HomeworksPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          숙제
        </h1>
        <p className="text-sm text-slate-600">
          선생님이 배정한 숙제를 확인하세요
        </p>
      </div>

      {/* Empty State */}
      <EmptyState 
        icon={<BookOpenIcon size={48} className="text-slate-300" />}
        title="아직 배정된 숙제가 없습니다"
        description="선생님이 숙제를 배정하면 여기에 표시됩니다"
      />
    </div>
  );
}
