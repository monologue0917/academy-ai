// Database Enums
export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';

// Question from Excel
export interface ExcelQuestion {
  order: number;
  type: QuestionType;
  passage?: string;
  content: string;
  choices?: string[];
  correctAnswer: string;
  points: number;
  difficulty: number;
  tags: string[];
  category?: string;
}

// Question in DB
export interface Question {
  id: string;
  academy_id: string;
  type: QuestionType;
  content: string;
  passage?: string;
  choices?: string[];
  correct_answer: string;
  explanation?: string;
  points: number;
  difficulty: number;
  tags: string[];
  category?: string;
  created_at: string;
  updated_at: string;
}

// Exam
export interface Exam {
  id: string;
  academy_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  duration: number;
  total_points: number;
  scheduled_at?: string;
  due_at?: string;
  shuffle_questions: boolean;
  show_answer_after: boolean;
  created_at: string;
  updated_at: string;
}

// Exam Question Mapping
export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
  points_override?: number;
  created_at: string;
}

// Create Exam Request
export interface CreateExamRequest {
  title: string;
  description?: string;
  duration: number;
  scheduled_at?: string;
  due_at?: string;
  class_ids: string[]; // 대상 반 목록
  shuffle_questions?: boolean;
  show_answer_after?: boolean;
}

// Import Questions Response
export interface ImportQuestionsResponse {
  success: boolean;
  questions: Question[];
  totalPoints: number;
  errors?: string[];
}

// ============================================
// AI 파싱 관련 타입 (Stage G-2)
// ============================================

// AI 파싱 결과 문제 타입
export interface ParsedQuestion {
  questionNumber: number;
  type: 'mcq' | 'short_answer' | 'essay';
  content: string;
  passage?: string | null;
  options: string[] | null; // mcq만 해당
  correctAnswer: string;
  points: number;
  category?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  tags?: string[];
}

// AI 파싱 API 응답
export interface ParseFileResponse {
  success: boolean;
  questions: ParsedQuestion[];
  error?: string;
}

// 시험 생성 (JSON 기반) 요청
export interface CreateExamFromJsonRequest {
  examData: {
    title: string;
    classId: string;
    scheduledAt: string;
    durationMinutes: number;
  };
  questions: ParsedQuestion[];
}

// 시험 생성 (JSON 기반) 응답
export interface CreateExamFromJsonResponse {
  success: boolean;
  examId: string;
  questionCount: number;
  totalPoints: number;
  error?: string;
}
