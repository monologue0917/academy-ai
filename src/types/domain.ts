/**
 * 학원 앱 도메인 타입 정의
 * 수능/내신 영어 학원용 모의고사·숙제 전용 앱
 */

// ============================================
// 기본 엔티티
// ============================================

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'teacher' | 'student';
  academyId: string;
  classIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Academy {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  academyId: string;
  teacherId: string;
  schedule?: ClassSchedule[];
}

export interface ClassSchedule {
  day: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  room?: string;
  note?: string;
}

// ============================================
// 문제 관련
// ============================================

export type QuestionType = 'mcq' | 'short_answer' | 'essay';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;           // 문제 본문
  passage?: string;          // 지문 (있을 경우)
  options?: string[];        // 객관식 선택지
  correctAnswer: string;     // 정답 (객관식: "1","2"... / 단답형: 정답 텍스트)
  explanation?: string;      // 해설
  points: number;            // 배점
  category?: string;         // 문제 유형 분류 (어휘, 문법, 독해 등)
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  createdAt: string;
}

// ============================================
// 시험 관련
// ============================================

export interface Exam {
  id: string;
  title: string;
  description?: string;
  classId: string;
  teacherId: string;
  duration: number;          // 제한 시간 (분)
  totalPoints: number;
  status: 'draft' | 'published' | 'closed';
  scheduledAt?: string;      // 시험 예정일
  dueAt?: string;            // 마감일
  createdAt: string;
}

export interface ExamQuestion {
  examId: string;
  questionId: string;
  orderIndex: number;
}

export interface ExamAssignment {
  id: string;
  examId: string;
  studentId: string;
  assignedAt: string;
  dueAt?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'graded';
}

// ============================================
// 숙제 관련
// ============================================

export interface Homework {
  id: string;
  title: string;
  description?: string;
  classId: string;
  teacherId: string;
  dueAt: string;             // 마감일시
  totalPoints: number;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
}

export interface HomeworkQuestion {
  homeworkId: string;
  questionId: string;
  orderIndex: number;
}

export interface HomeworkAssignment {
  id: string;
  homeworkId: string;
  studentId: string;
  assignedAt: string;
  dueAt: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'graded';
}

// ============================================
// 제출 관련
// ============================================

export type SubmissionType = 'exam' | 'homework';

export interface Submission {
  id: string;
  type: SubmissionType;
  referenceId: string;       // examId 또는 homeworkId
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  maxScore: number;
  gradedAt?: string;
  gradedBy?: string;
  feedback?: string;
}

export interface SubmissionAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  earnedPoints?: number;
  feedback?: string;
}

// ============================================
// 오답 노트
// ============================================

export interface WrongNote {
  id: string;
  studentId: string;
  questionId: string;
  submissionType: SubmissionType;
  submissionId: string;
  studentAnswer: string;
  correctAnswer: string;
  reviewCount: number;
  lastReviewedAt?: string;
  mastered: boolean;
  createdAt: string;
}

// ============================================
// 학생 홈페이지용 Props
// ============================================

export interface StudentHomeData {
  student: Pick<User, 'id' | 'name'>;
  todayTasks: TodayTasks;
  reviewSuggestion: ReviewSuggestion;
}

export interface TodayTasks {
  exam: TodayExam | null;
  homeworks: TodayHomework[];
}

export interface TodayExam {
  id: string;
  title: string;
  duration: number;
  totalQuestions: number;
  scheduledAt: string;
  status: 'not_started' | 'in_progress';
}

export interface TodayHomework {
  id: string;
  title: string;
  totalQuestions: number;
  dueAt: string;
  status: 'pending' | 'in_progress' | 'submitted';
  completedQuestions: number;
}

export interface ReviewSuggestion {
  wrongNotes: ReviewWrongNote[];
  weakAreas: WeakArea[];
}

export interface ReviewWrongNote {
  id: string;
  questionPreview: string;   // 문제 미리보기 (30자 정도)
  category: string;
  wrongCount: number;
}

export interface WeakArea {
  category: string;
  wrongRate: number;         // 오답률 (0~100)
  totalAttempts: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
