'use client';

import { TodayTasksSection } from './TodayTasksSection';
import { ReviewSuggestionSection } from './ReviewSuggestionSection';
import type { StudentHomeData } from '@/types';

interface StudentHomePageProps {
  data: StudentHomeData;
  onExamStart?: (examId: string) => void;
  onHomeworkClick?: (homeworkId: string) => void;
  onStartReview?: () => void;
  onWeakAreaClick?: (category: string) => void;
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  
  let greeting = '안녕하세요';
  if (hour >= 5 && hour < 12) {
    greeting = '좋은 아침이에요';
  } else if (hour >= 12 && hour < 17) {
    greeting = '좋은 오후예요';
  } else if (hour >= 17 && hour < 21) {
    greeting = '좋은 저녁이에요';
  } else {
    greeting = '늦은 시간이네요';
  }
  
  return (
    <header className="mb-6">
      <p className="text-gray-500 text-sm">{greeting}</p>
      <h1 className="text-xl font-bold text-gray-900 mt-0.5">
        {name}님
      </h1>
    </header>
  );
}

export function StudentHomePage({
  data,
  onExamStart,
  onHomeworkClick,
  onStartReview,
  onWeakAreaClick,
}: StudentHomePageProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Greeting name={data.student.name} />
        
        <div className="space-y-8">
          <TodayTasksSection 
            tasks={data.todayTasks}
            onExamStart={onExamStart}
            onHomeworkClick={onHomeworkClick}
          />
          
          <ReviewSuggestionSection 
            suggestion={data.reviewSuggestion}
            onStartReview={onStartReview}
            onWeakAreaClick={onWeakAreaClick}
          />
        </div>
      </main>
    </div>
  );
}
