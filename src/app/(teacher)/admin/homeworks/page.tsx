'use client';

import { useRouter } from 'next/navigation';
import {
  PageHeader,
  AppCard,
  CardHeader,
  CardContent,
  CardFooter,
  StatusBadge,
  Button,
  PlusIcon,
  UsersIcon,
} from '@/components/ui';

/**
 * 숙제 관리 페이지
 * 
 * 구성:
 * 1. PageHeader (+ 새 숙제 버튼)
 * 2. 숙제 목록 카드
 */
export default function HomeworksPage() {
  const router = useRouter();

  // Mock data
  const homeworks = [
    {
      id: '1',
      title: 'Lesson 3 본문 독해 연습',
      description: '본문 1-3번 문제 풀이 + 단어 암기',
      className: '고2-A반',
      status: 'ongoing' as const,
      dueDate: '2024-12-16',
      questionCount: 15,
      completedCount: 18,
      totalStudents: 25,
    },
    {
      id: '2',
      title: '문법 워크북 p.45-50',
      description: '관계대명사 문제 풀이',
      className: '고1-A반',
      status: 'due-soon' as const,
      dueDate: '2024-12-14',
      questionCount: 20,
      completedCount: 10,
      totalStudents: 14,
    },
    {
      id: '3',
      title: '수능 어휘 200개 암기',
      description: 'Day 10-15 단어 및 예문',
      className: '고3-A반',
      status: 'completed' as const,
      dueDate: '2024-12-12',
      questionCount: 30,
      completedCount: 30,
      totalStudents: 30,
    },
    {
      id: '4',
      title: '독해 부교재 Chapter 5',
      description: '지문 분석 및 문제 풀이',
      className: '고3-B반',
      status: 'scheduled' as const,
      dueDate: '2024-12-22',
      questionCount: 12,
      completedCount: 0,
      totalStudents: 28,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="숙제 관리"
        description="숙제를 생성하고 학생들의 제출을 관리하세요"
        actions={
          <Button leftIcon={<PlusIcon size={16} />}>
            새 숙제
          </Button>
        }
      />

      {/* Homeworks List */}
      <div className="space-y-3">
        {homeworks.map((homework) => (
          <AppCard key={homework.id} hover onClick={() => router.push(`/admin/homeworks/${homework.id}`)}>
            <CardHeader 
              title={homework.title}
              subtitle={homework.description}
              badge={<StatusBadge status={homework.status} />}
            />

            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-1">대상 반</p>
                  <p className="font-medium text-slate-900">{homework.className}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs mb-1">마감일</p>
                  <p className="font-medium text-slate-900">
                    {new Date(homework.dueDate).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs mb-1">문제 수</p>
                  <p className="font-medium text-slate-900">
                    {homework.questionCount}문제
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs mb-1">제출 현황</p>
                  <div className="flex items-center gap-1">
                    <UsersIcon size={12} className="text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {homework.completedCount}/{homework.totalStudents}
                    </span>
                    <span className="text-slate-500 text-xs">
                      ({Math.round((homework.completedCount / homework.totalStudents) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button variant="secondary" size="sm">
                제출 확인
              </Button>
              <Button variant="ghost" size="sm">
                수정
              </Button>
            </CardFooter>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
