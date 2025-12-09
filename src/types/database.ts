/**
 * 데이터베이스 타입 정의
 * 
 * 실제 Supabase 스키마 기반 (2024년 12월 기준)
 * 
 * ⚠️ 이 파일은 DB 스키마의 단일 진실 공급원(Single Source of Truth)입니다.
 * DB 스키마 변경 시 이 파일도 반드시 업데이트하세요.
 */

// ============================================
// ENUM 타입들 (실제 DB 값)
// ============================================

export type UserRole = 'student' | 'teacher' | 'admin';

export type AssignmentStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export type AssignmentType = 'exam' | 'homework';

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded';

export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';

// ============================================
// 상수 (코드에서 사용)
// ============================================

export const ASSIGNMENT_STATUS = {
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const SUBMISSION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
} as const;

// ============================================
// 테이블 타입들
// ============================================

export interface Academy {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  code: string | null;
  settings: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  academy_id: string;
  auth_id: string | null;
  role: UserRole;
  email: string | null;
  name: string;
  phone: string | null;
  grade: string | null;
  student_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  academy_id: string;
  teacher_id: string;
  name: string;
  subject: string | null;
  grade: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  academy_id: string;
  teacher_id: string;
  type: QuestionType;
  content: string;
  correct_answer: string;
  choices: string[] | null;
  explanation: string | null;
  difficulty_level: number | null;
  tags: string[] | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  ai_explanation: string | null;
  ai_hints: string | null;
  ai_skill_tags: string[] | null;
  ai_generated_at: string | null;
  ai_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  academy_id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  total_points: number | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  instructions: string | null;
  settings: Record<string, unknown> | null;
  allow_retry: boolean;
  shuffle_questions: boolean;
  show_answer_after: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_num: number;
  points: number;
  created_at: string;
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  class_id: string | null;
  student_id: string | null;
  status: AssignmentStatus;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface Homework {
  id: string;
  academy_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  total_points: number | null;
  instructions: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkQuestion {
  id: string;
  homework_id: string;
  question_id: string;
  order_num: number;
  points: number;
  created_at: string;
}

export interface HomeworkAssignment {
  id: string;
  homework_id: string;
  class_id: string | null;
  student_id: string | null;
  status: AssignmentStatus;
  start_time: string;
  due_time: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  academy_id: string;
  student_id: string;
  assignment_type: AssignmentType;
  assignment_id: string;
  status: SubmissionStatus;
  score: number | null;
  max_score: number;
  started_at: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  time_spent_seconds: number | null;
  feedback: string | null;
  metadata: SubmissionMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionMetadata {
  exam_id?: string;
  answers?: SubmissionAnswer[];
  percentage?: number;
  correct_count?: number;
  total_count?: number;
}

export interface SubmissionAnswer {
  questionId: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
}

export interface WrongNote {
  id: string;
  academy_id: string;
  student_id: string;
  question_id: string;
  exam_id: string | null;        // 시험 삭제 시 CASCADE 삭제
  assignment_id: string | null;  // 배정 삭제 시 CASCADE 삭제
  student_answer: string | null;
  wrong_count: number;
  times_wrong: number;
  first_wrong_at: string;
  last_wrong_at: string;
  last_correct_at: string | null;
  review_priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIExplanationCache {
  id: string;
  cache_key: string;
  question_id: string;
  student_answer: string;
  correct_answer: string;
  explanation: string;
  model: string;
  created_at: string;
}

// ============================================
// API 응답 타입들
// ============================================

export interface StudentHomeResponse {
  success: boolean;
  todayExams: TodayExam[];
  todayHomeworks: TodayHomework[];
  reviewStats: ReviewStats;
}

export interface TodayExam {
  id: string;
  assignmentId: string;
  title: string;
  className: string;
  duration: number;
  totalPoints: number;
  totalQuestions: number;
  scheduledAt: string;
  dueAt: string | null;
  status: AssignmentStatus;
  isStarted: boolean;
  startedAt: string | null;
}

export interface TodayHomework {
  id: string;
  assignmentId: string;
  title: string;
  className: string;
  totalQuestions: number;
  completedQuestions: number;
  dueAt: string | null;
  status: AssignmentStatus;
}

export interface TodayTasks {
  exams: TodayExam[];
  homeworks: TodayHomework[];
}

export interface ReviewStats {
  totalWrong: number;
  reviewedToday: number;
  todayLimit: number;
}

export interface ExamResultAnswer {
  questionId: string;
  orderNum: number;
  content: string;
  choices: string[];
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
  explanation: string | null;
}

export interface WrongNoteItem {
  id: string;
  questionId: string;
  studentAnswer: string | null;
  wrongCount: number;
  firstWrongAt: string;
  lastWrongAt: string;
  lastCorrectAt: string | null;
  reviewPriority: number;
  notes: string | null;
  question: {
    id: string;
    type: QuestionType;
    content: string;
    choices: string[];
    correctAnswer: string;
    explanation: string | null;
    difficulty: number | null;
    tags: string[];
  } | null;
}

export interface AIExplanation {
  correct_reason: string;
  wrong_reason: string;
  key_points: string[];
  next_time_tips: string[];
}

// 복습 추천 관련 타입
export interface ReviewWrongNote {
  id: string;
  questionId: string;
  content: string;
  questionPreview: string;
  category: string;
  wrongCount: number;
  lastWrongAt: string;
}

export interface WeakArea {
  category: string;
  label: string;
  wrongCount: number;
  totalQuestions: number;
  totalAttempts: number;
  accuracy: number;
  wrongRate: number;
}

export interface ReviewSuggestion {
  wrongNotes: ReviewWrongNote[];
  weakAreas: WeakArea[];
  totalWrong: number;
  reviewedToday: number;
  dailyLimit: number;
}

// 학생 홈 페이지 데이터
export interface StudentHomeData {
  student: {
    id: string;
    name: string;
    grade?: string;
  };
  todayTasks: {
    exams: TodayExam[];
    homeworks: TodayHomework[];
  };
  reviewSuggestion: ReviewSuggestion;
}

// ============================================
// 유틸리티 타입들
// ============================================

export type Tables = {
  academies: Academy;
  users: User;
  classes: Class;
  class_enrollments: ClassEnrollment;
  questions: Question;
  exams: Exam;
  exam_questions: ExamQuestion;
  exam_assignments: ExamAssignment;
  homeworks: Homework;
  homework_questions: HomeworkQuestion;
  homework_assignments: HomeworkAssignment;
  submissions: Submission;
  wrong_notes: WrongNote;
  ai_explanations_cache: AIExplanationCache;
};
