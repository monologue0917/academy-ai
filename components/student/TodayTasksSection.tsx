'use client';

import { Card, CardHeader, Badge, Button, ClipboardIcon, BookOpenIcon, ClockIcon, ChevronRightIcon, PlayIcon } from '@/components/ui';
import type { TodayTasks, TodayExam, TodayHomework } from '@/types';

interface TodayTasksSectionProps {
  tasks: TodayTasks;
  onExamStart?: (examId: string) => void;
  onHomeworkClick?: (homeworkId: string) => void;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDueTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return '마감됨';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    return `${Math.floor(hours / 24)}일 남음`;
  }
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  }
  return `${minutes}분 남음`;
}

function ExamCard({ exam, onStart }: { exam: TodayExam; onStart?: (id: string) => void }) {
  const isInProgress = exam.status === 'ongoing';
  
  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <ClipboardIcon className="text-white" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{exam.title}</h4>
            {isInProgress && (
              <Badge variant="warning">진행중</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <ClockIcon size={14} />
              {exam.duration}분
            </span>
            <span>{exam.totalQuestions}문제</span>
            <span>{formatTime(exam.scheduledAt)} 시작</span>
          </div>
        </div>
      </div>
      <Button
        className="mt-3"
        fullWidth
        onClick={() => onStart?.(exam.id)}
        leftIcon={<PlayIcon size={16} />}
      >
        {isInProgress ? '계속하기' : '시험 시작'}
      </Button>
    </Card>
  );
}

function HomeworkCard({ homework, onClick }: { homework: TodayHomework; onClick?: (id: string) => void }) {
  const progress = homework.totalQuestions > 0 
    ? Math.round((homework.completedQuestions / homework.totalQuestions) * 100)
    : 0;
  
  const getStatusBadge = () => {
    switch (homework.status) {
      case 'completed':
        return <Badge variant="success">제출완료</Badge>;
      case 'ongoing':
        return <Badge variant="warning">진행중</Badge>;
      case 'scheduled':
        return <Badge variant="default">미시작</Badge>;
      default:
        return <Badge variant="default">미시작</Badge>;
    }
  };
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(homework.id)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <BookOpenIcon className="text-emerald-600" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{homework.title}</h4>
            <ChevronRightIcon className="text-gray-400 flex-shrink-0" size={18} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{homework.completedQuestions}/{homework.totalQuestions}문제</span>
            <span className="text-gray-400">•</span>
            <span className="text-amber-600 font-medium">
              {homework.dueAt ? formatDueTime(homework.dueAt) : '기한 없음'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge()}
            {homework.status !== 'completed' && (
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TodayTasksSection({ tasks, onExamStart, onHomeworkClick }: TodayTasksSectionProps) {
  const hasExams = tasks.exams.length > 0;
  const hasHomeworks = tasks.homeworks.length > 0;
  const isEmpty = !hasExams && !hasHomeworks;
  
  return (
    <section className="space-y-4">
      <CardHeader 
        title="오늘의 할 일" 
        subtitle={isEmpty ? undefined : `${hasExams ? `시험 ${tasks.exams.length}개` : ''}${hasExams && hasHomeworks ? ', ' : ''}${hasHomeworks ? `숙제 ${tasks.homeworks.length}개` : ''}`}
      />
      
      {isEmpty ? (
        <Card className="text-center py-8">
          <p className="text-gray-500 text-sm">오늘 할 일이 없어요! 🎉</p>
          <p className="text-gray-400 text-xs mt-1">복습을 해보는 건 어떨까요?</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} onStart={onExamStart} />
          ))}
          {tasks.homeworks.map((hw) => (
            <HomeworkCard key={hw.id} homework={hw} onClick={onHomeworkClick} />
          ))}
        </div>
      )}
    </section>
  );
}
