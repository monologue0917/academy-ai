'use client';

import { StudentHomePage } from '@/components/student';
import { mockStudentHomeData } from '@/data/mockStudentHome';
import { useRouter } from 'next/navigation';

export default function StudentHome() {
  const router = useRouter();
  
  // 이벤트 핸들러들 - 나중에 실제 라우팅/API 연동
  const handleExamStart = (examId: string) => {
    console.log('시험 시작:', examId);
    // router.push(`/student/exam/${examId}`);
    alert(`시험 시작: ${examId}`);
  };
  
  const handleHomeworkClick = (homeworkId: string) => {
    console.log('숙제 클릭:', homeworkId);
    // router.push(`/student/homework/${homeworkId}`);
    alert(`숙제 페이지로 이동: ${homeworkId}`);
  };
  
  const handleStartReview = () => {
    console.log('복습 시작');
    // router.push('/student/review');
    alert('복습 페이지로 이동');
  };
  
  const handleWeakAreaClick = (category: string) => {
    console.log('약한 영역 클릭:', category);
    // router.push(`/student/review?category=${category}`);
    alert(`${category} 영역 복습 페이지로 이동`);
  };
  
  return (
    <StudentHomePage
      data={mockStudentHomeData}
      onExamStart={handleExamStart}
      onHomeworkClick={handleHomeworkClick}
      onStartReview={handleStartReview}
      onWeakAreaClick={handleWeakAreaClick}
    />
  );
}
