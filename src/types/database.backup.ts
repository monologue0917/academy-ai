/**
 * Supabase Database Types
 * 자동 생성 권장: npx supabase gen types typescript
 * 이 파일은 수동으로 관리하는 DB 타입 정의입니다.
 */

// ============================================
// ENUM Types
// ============================================

export type UserRole = 'teacher' | 'student';
export type QuestionType = 'mcq' | 'short_answer' | 'essay';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ContentStatus = 'draft' | 'published' | 'closed';
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'graded';
export type SubmissionType = 'exam' | 'homework';

// ============================================
// Database Row Types
// ============================================

export interface DbAcademy {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  academy_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: UserRole;
  password_hash: string | null;
  profile_image: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbClass {
  id: string;
  academy_id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  schedule: ClassScheduleItem[];
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassScheduleItem {
  day: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  startTime: string;
  endTime: string;
  room?: string;
  note?: string;
}

export interface DbClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  is_active: boolean;
}

export interface DbQuestion {
  id: string;
  academy_id: string;
  created_by: string;
  type: QuestionType;
  content: string;
  passage: string | null;
  options: string[] | null;  // JSON 배열
  correct_answer: string;
  explanation: string | null;
  points: number;
  category: string | null;
  difficulty: DifficultyLevel | null;
  tags: string[];
  source: string | null;
  attempt_count: number;
  correct_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbExam {
  id: string;
  academy_id: string;
  class_id: string;
  created_by: string;
  title: string;
  description: string | null;
  duration: number;
  total_points: number;
  pass_score: number | null;
  scheduled_at: string | null;
  due_at: string | null;
  shuffle_questions: boolean;
  show_answer_after: boolean;
  allow_retry: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface DbExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
  points_override: number | null;
}

export interface DbHomework {
  id: string;
  academy_id: string;
  class_id: string;
  created_by: string;
  title: string;
  description: string | null;
  instructions: string | null;
  total_points: number;
  due_at: string;
  allow_late: boolean;
  late_penalty: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface DbHomeworkQuestion {
  id: string;
  homework_id: string;
  question_id: string;
  order_index: number;
  points_override: number | null;
}

export interface DbExamAssignment {
  id: string;
  exam_id: string;
  student_id: string;
  assigned_at: string;
  due_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  status: AssignmentStatus;
}

export interface DbHomeworkAssignment {
  id: string;
  homework_id: string;
  student_id: string;
  assigned_at: string;
  due_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  status: AssignmentStatus;
}

export interface DbSubmission {
  id: string;
  type: SubmissionType;
  exam_id: string | null;
  homework_id: string | null;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  time_spent: number | null;
  score: number | null;
  max_score: number;
  percentage: number | null;
  graded_at: string | null;
  graded_by: string | null;
  feedback: string | null;
  is_late: boolean;
  attempt_number: number;
  created_at: string;
}

export interface DbSubmissionAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer: string | null;
  is_correct: boolean | null;
  earned_points: number | null;
  max_points: number;
  ai_feedback: string | null;
  teacher_feedback: string | null;
  answered_at: string;
}

export interface DbWrongNote {
  id: string;
  student_id: string;
  question_id: string;
  submission_type: SubmissionType;
  submission_id: string;
  student_answer: string;
  correct_answer: string;
  review_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  mastered: boolean;
  mastered_at: string | null;
  created_at: string;
}

// ============================================
// Insert/Update Types (Optional fields 처리)
// ============================================

export type DbAcademyInsert = Omit<DbAcademy, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type DbUserInsert = Omit<DbUser, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> & {
  id?: string;
};

export type DbQuestionInsert = Omit<DbQuestion, 'id' | 'created_at' | 'updated_at' | 'attempt_count' | 'correct_count'> & {
  id?: string;
};

export type DbExamInsert = Omit<DbExam, 'id' | 'created_at' | 'updated_at' | 'total_points'> & {
  id?: string;
};

export type DbHomeworkInsert = Omit<DbHomework, 'id' | 'created_at' | 'updated_at' | 'total_points'> & {
  id?: string;
};

// ============================================
// Joined/Extended Types (API 응답용)
// ============================================

export interface QuestionWithStats extends DbQuestion {
  correctRate: number;  // correct_count / attempt_count * 100
}

export interface ExamWithQuestions extends DbExam {
  questions: (DbExamQuestion & { question: DbQuestion })[];
  questionCount: number;
}

export interface HomeworkWithQuestions extends DbHomework {
  questions: (DbHomeworkQuestion & { question: DbQuestion })[];
  questionCount: number;
}

export interface SubmissionWithAnswers extends DbSubmission {
  answers: DbSubmissionAnswer[];
  exam?: DbExam;
  homework?: DbHomework;
}

export interface StudentWithEnrollments extends DbUser {
  enrollments: (DbClassEnrollment & { class: DbClass })[];
}

export interface ClassWithStudents extends DbClass {
  students: DbUser[];
  studentCount: number;
}
