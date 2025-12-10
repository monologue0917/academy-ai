'use client';

import { Card, CardHeader, Badge, Button, RefreshIcon, TargetIcon, TrendingDownIcon, ChevronRightIcon } from '@/components/ui';
import type { ReviewSuggestion, ReviewWrongNote, WeakArea } from '@/types';

interface ReviewSuggestionSectionProps {
  suggestion: ReviewSuggestion;
  onStartReview?: () => void;
  onWeakAreaClick?: (category: string) => void;
}

function WrongNotesCard({ 
  wrongNotes, 
  onStartReview 
}: { 
  wrongNotes: ReviewWrongNote[]; 
  onStartReview?: () => void 
}) {
  const count = wrongNotes.length;
  
  if (count === 0) {
    return (
      <Card className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🎯</span>
        </div>
        <p className="text-gray-600 font-medium">오답이 없어요!</p>
        <p className="text-gray-400 text-sm mt-1">모든 문제를 맞혔습니다</p>
      </Card>
    );
  }
  
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
          <RefreshIcon className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">오늘의 오답 {count}문제</h4>
          <p className="text-sm text-gray-600 mt-1">
            틀린 문제를 다시 풀어보세요
          </p>
        </div>
      </div>
      
      {/* 오답 미리보기 */}
      <div className="mt-4 space-y-2">
        {wrongNotes.slice(0, 3).map((note, index) => (
          <div 
            key={note.id}
            className="flex items-center gap-2 text-sm bg-white/60 rounded-lg px-3 py-2"
          >
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
              {index + 1}
            </span>
            <span className="text-gray-700 truncate">{note.questionPreview}</span>
            <Badge variant="default" size="sm" className="flex-shrink-0">
              {note.category}
            </Badge>
          </div>
        ))}
        {count > 3 && (
          <p className="text-xs text-gray-500 pl-7">+{count - 3}문제 더</p>
        )}
      </div>
      
      <Button
        className="mt-4"
        fullWidth
        onClick={onStartReview}
        rightIcon={<ChevronRightIcon size={16} />}
      >
        복습 시작하기
      </Button>
    </Card>
  );
}

function WeakAreasCard({ 
  weakAreas, 
  onWeakAreaClick 
}: { 
  weakAreas: WeakArea[];
  onWeakAreaClick?: (category: string) => void;
}) {
  if (weakAreas.length === 0) {
    return null;
  }
  
  // 상위 3개만 표시
  const topAreas = weakAreas.slice(0, 3);
  
  const getColorByRank = (index: number) => {
    switch (index) {
      case 0: return 'bg-red-100 text-red-700 border-red-200';
      case 1: return 'bg-orange-100 text-orange-700 border-orange-200';
      case 2: return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const getProgressColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-orange-500';
      case 2: return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <TargetIcon className="text-indigo-600" size={20} />
        <h4 className="font-semibold text-gray-900">약한 영역 TOP3</h4>
      </div>
      
      <div className="space-y-3">
        {topAreas.map((area, index) => (
          <button
            key={area.category}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50 ${getColorByRank(index)}`}
            onClick={() => onWeakAreaClick?.(area.category)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{area.category}</span>
                  <TrendingDownIcon className="flex-shrink-0 opacity-70" size={16} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getProgressColor(index)}`}
                      style={{ width: `${area.wrongRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{area.wrongRate}%</span>
                </div>
                <p className="text-xs opacity-70 mt-0.5">
                  {area.totalAttempts}문제 중 오답
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function ReviewSuggestionSection({ 
  suggestion, 
  onStartReview, 
  onWeakAreaClick 
}: ReviewSuggestionSectionProps) {
  const hasWrongNotes = suggestion.wrongNotes.length > 0;
  const hasWeakAreas = suggestion.weakAreas.length > 0;
  
  if (!hasWrongNotes && !hasWeakAreas) {
    return null;
  }
  
  return (
    <section className="space-y-4">
      <CardHeader 
        title="복습 추천" 
        subtitle="취약한 부분을 보완해보세요"
      />
      
      <div className="space-y-3">
        <WrongNotesCard 
          wrongNotes={suggestion.wrongNotes} 
          onStartReview={onStartReview}
        />
        <WeakAreasCard 
          weakAreas={suggestion.weakAreas}
          onWeakAreaClick={onWeakAreaClick}
        />
      </div>
    </section>
  );
}
