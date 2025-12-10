'use client';

interface WeakAreaButtonsProps {
  areas: string[];
  onAreaClick?: (area: string) => void;
}

/**
 * WeakAreaButtons - 약한 영역 버튼들 (클릭 가능)
 * Client Component로 분리하여 onClick 이벤트 처리
 */
export function WeakAreaButtons({ areas, onAreaClick }: WeakAreaButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {areas.map((area, index) => (
        <button
          key={area}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-100 transition-colors"
          onClick={() => onAreaClick?.(area)}
        >
          <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-[10px] font-bold">
            {index + 1}
          </span>
          {area}
        </button>
      ))}
    </div>
  );
}
