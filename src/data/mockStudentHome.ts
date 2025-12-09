/**
 * 학생 홈페이지용 더미 데이터
 * 개발/테스트용 목업 데이터
 */

import type { StudentHomeData } from '@/types';

// 현재 시간 기준 날짜 생성 헬퍼
const now = new Date();
const todayEnd = new Date(now);
todayEnd.setHours(23, 59, 59, 999);

const twoHoursLater = new Date(now);
twoHoursLater.setHours(now.getHours() + 2);

const fourHoursLater = new Date(now);
fourHoursLater.setHours(now.getHours() + 4);

const sixHoursLater = new Date(now);
sixHoursLater.setHours(now.getHours() + 6);

/**
 * 오늘 시험이 있고, 숙제가 2개 있는 학생 데이터
 */
export const mockStudentHomeData: StudentHomeData = {
  student: {
    id: 'student-001',
    name: '김민준',
  },
  todayTasks: {
    exams: [
      {
        id: 'exam-001',
        assignmentId: 'assignment-001',
        title: '9월 모의고사 독해 파트',
        className: '수능반',
        duration: 40,
        totalPoints: 100,
        totalQuestions: 20,
        scheduledAt: twoHoursLater.toISOString(),
        dueAt: fourHoursLater.toISOString(),
        status: 'scheduled',
        isStarted: false,
        startedAt: null,
      },
    ],
    homeworks: [
      {
        id: 'hw-001',
        assignmentId: 'hw-assignment-001',
        title: 'EBS 변형 세트 Day 5',
        className: '수능반',
        totalQuestions: 15,
        completedQuestions: 8,
        dueAt: fourHoursLater.toISOString(),
        status: 'ongoing',
      },
      {
        id: 'hw-002',
        assignmentId: 'hw-assignment-002',
        title: '문법 Sprint Week 3',
        className: '수능반',
        totalQuestions: 20,
        completedQuestions: 0,
        dueAt: sixHoursLater.toISOString(),
        status: 'scheduled',
      },
    ],
  },
  reviewSuggestion: {
    wrongNotes: [
      {
        id: 'wrong-001',
        questionId: 'q-001',
        content: 'The author implies that the...',
        questionPreview: 'The author implies that the...',
        category: '빈칸추론',
        wrongCount: 3,
        lastWrongAt: now.toISOString(),
      },
      {
        id: 'wrong-002',
        questionId: 'q-002',
        content: 'Which of the following best...',
        questionPreview: 'Which of the following best...',
        category: '주제파악',
        wrongCount: 2,
        lastWrongAt: now.toISOString(),
      },
      {
        id: 'wrong-003',
        questionId: 'q-003',
        content: 'According to the passage...',
        questionPreview: 'According to the passage...',
        category: '세부정보',
        wrongCount: 2,
        lastWrongAt: now.toISOString(),
      },
    ],
    weakAreas: [
      {
        category: '빈칸추론',
        label: '빈칸추론',
        wrongCount: 15,
        totalQuestions: 23,
        totalAttempts: 23,
        accuracy: 35,
        wrongRate: 65,
      },
      {
        category: '순서배열',
        label: '순서배열',
        wrongCount: 9,
        totalQuestions: 17,
        totalAttempts: 17,
        accuracy: 48,
        wrongRate: 52,
      },
    ],
    totalWrong: 5,
    reviewedToday: 0,
    dailyLimit: 10,
  },
};

/**
 * 시험이 진행 중인 학생 데이터
 */
export const mockStudentInProgressExam: StudentHomeData = {
  student: {
    id: 'student-002',
    name: '이서연',
  },
  todayTasks: {
    exams: [
      {
        id: 'exam-002',
        assignmentId: 'assignment-002',
        title: '주간 테스트 - 문법',
        className: '수능반',
        duration: 30,
        totalPoints: 100,
        totalQuestions: 15,
        scheduledAt: new Date(now.getTime() - 10 * 60000).toISOString(),
        dueAt: twoHoursLater.toISOString(),
        status: 'ongoing',
        isStarted: true,
        startedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      },
    ],
    homeworks: [
      {
        id: 'hw-003',
        assignmentId: 'hw-assignment-003',
        title: '단어 암기 테스트 준비',
        className: '수능반',
        totalQuestions: 50,
        completedQuestions: 50,
        dueAt: todayEnd.toISOString(),
        status: 'completed',
      },
    ],
  },
  reviewSuggestion: {
    wrongNotes: [],
    weakAreas: [],
    totalWrong: 0,
    reviewedToday: 0,
    dailyLimit: 10,
  },
};

/**
 * 할 일이 없는 학생 데이터 (숙제 다 함)
 */
export const mockStudentNoTasks: StudentHomeData = {
  student: {
    id: 'student-003',
    name: '박지호',
  },
  todayTasks: {
    exams: [],
    homeworks: [],
  },
  reviewSuggestion: {
    wrongNotes: [],
    weakAreas: [],
    totalWrong: 0,
    reviewedToday: 0,
    dailyLimit: 10,
  },
};

/**
 * 숙제만 있는 학생 데이터
 */
export const mockStudentHomeworkOnly: StudentHomeData = {
  student: {
    id: 'student-004',
    name: '정수아',
  },
  todayTasks: {
    exams: [],
    homeworks: [
      {
        id: 'hw-004',
        assignmentId: 'hw-assignment-004',
        title: '독해 지문 분석 Day 7',
        className: '수능반',
        totalQuestions: 10,
        completedQuestions: 3,
        dueAt: fourHoursLater.toISOString(),
        status: 'ongoing',
      },
      {
        id: 'hw-005',
        assignmentId: 'hw-assignment-005',
        title: '수능 기출 어휘 50',
        className: '수능반',
        totalQuestions: 50,
        completedQuestions: 0,
        dueAt: sixHoursLater.toISOString(),
        status: 'scheduled',
      },
      {
        id: 'hw-006',
        assignmentId: 'hw-assignment-006',
        title: '리스닝 스크립트 정리',
        className: '수능반',
        totalQuestions: 5,
        completedQuestions: 5,
        dueAt: todayEnd.toISOString(),
        status: 'completed',
      },
    ],
  },
  reviewSuggestion: {
    wrongNotes: [
      {
        id: 'wrong-008',
        questionId: 'q-008',
        content: 'The main purpose of...',
        questionPreview: 'The main purpose of...',
        category: '글의목적',
        wrongCount: 2,
        lastWrongAt: now.toISOString(),
      },
    ],
    weakAreas: [
      {
        category: '장문독해',
        label: '장문독해',
        wrongCount: 10,
        totalQuestions: 18,
        totalAttempts: 18,
        accuracy: 45,
        wrongRate: 55,
      },
    ],
    totalWrong: 1,
    reviewedToday: 0,
    dailyLimit: 10,
  },
};
