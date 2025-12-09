-- ============================================================================
-- Academy AI - Database Schema Migration (최종 보완 버전)
-- 수능/내신 영어 학원용 모의고사·숙제 전용 앱
-- ============================================================================
-- Supabase (PostgreSQL) 마이그레이션
-- 생성일: 2024-12-08
-- 버전: v2.0 (요구사항 반영 완료)
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS & CUSTOM TYPES (ENUM)
-- ============================================================================

-- UUID 생성 확장 (Supabase에서 기본 활성화됨)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 역할
CREATE TYPE user_role AS ENUM ('teacher', 'student');

-- 문제 유형
CREATE TYPE question_type AS ENUM ('mcq', 'short_answer', 'essay');

-- 난이도
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- 시험/숙제 상태
CREATE TYPE content_status AS ENUM ('draft', 'published', 'closed');

-- 할당 상태 (학생 진행 상태)
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'submitted', 'graded');

-- 제출 타입
CREATE TYPE submission_type AS ENUM ('exam', 'homework');


-- ============================================================================
-- 1. CORE TABLES (기본 엔티티)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 academies (학원)
-- -----------------------------------------------------------------------------
-- 역할: 학원 정보 저장, 멀티테넌트 최상위 엔티티
-- 주요 컬럼:
--   - code: 학생이 학원에 입장할 때 사용하는 고유 코드 (예: "GANGNAM01")
--   - settings: 학원별 커스텀 설정 (JSON) - 향후 확장용
-- -----------------------------------------------------------------------------
CREATE TABLE academies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,                -- 학원 이름
    code        VARCHAR(20) NOT NULL UNIQUE,          -- 입장 코드
    logo_url    TEXT,                                 -- 로고 이미지 URL
    settings    JSONB DEFAULT '{}',                   -- 학원별 설정
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academies IS '학원 정보 (멀티테넌트 최상위 엔티티)';
COMMENT ON COLUMN academies.code IS '학생 입장 코드 (예: GANGNAM01)';
COMMENT ON COLUMN academies.settings IS '학원별 커스텀 설정 (JSON)';


-- -----------------------------------------------------------------------------
-- 1.2 users (사용자: 선생님/학생)
-- -----------------------------------------------------------------------------
-- 역할: 선생님과 학생 계정 관리
-- 주요 컬럼:
--   - role: 'teacher' 또는 'student'
--   - email: 선생님은 필수, 학생은 선택 (학생은 이름만으로도 가능)
--   - password_hash: 선생님은 실제 비밀번호, 학생은 간단한 PIN
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE,              -- 선생님 필수, 학생 선택
    phone           VARCHAR(20),
    name            VARCHAR(50) NOT NULL,
    role            user_role NOT NULL,               -- teacher / student
    password_hash   TEXT,                             -- 비밀번호 해시
    profile_image   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS '사용자 (선생님, 학생)';
COMMENT ON COLUMN users.role IS 'teacher: 선생님, student: 학생';

-- 인덱스
CREATE INDEX idx_users_academy_id ON users(academy_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 1.3 classes (반)
-- -----------------------------------------------------------------------------
-- 역할: 수업 반 관리 (예: 고3-A반, 고2-B반)
-- 주요 컬럼:
--   - schedule: 주간 시간표 JSON 배열 [{ day, startTime, endTime, room }]
--   - color: UI에서 반 구분용 색상 코드
-- -----------------------------------------------------------------------------
CREATE TABLE classes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name        VARCHAR(100) NOT NULL,                -- 반 이름 (예: 고3-A반)
    description TEXT,
    schedule    JSONB DEFAULT '[]',                   -- 주간 시간표 (JSON)
    color       VARCHAR(7),                           -- HEX 색상 (#4F46E5)
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE classes IS '수업 반';
COMMENT ON COLUMN classes.schedule IS '주간 시간표 JSON 배열';

-- 인덱스
CREATE INDEX idx_classes_academy_id ON classes(academy_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);


-- -----------------------------------------------------------------------------
-- 1.4 class_enrollments (반 등록 - 학생과 반의 다대다 관계)
-- -----------------------------------------------------------------------------
-- 역할: 학생이 어느 반에 속해있는지 관리
-- 특징: 한 학생이 여러 반에 동시 소속 가능
-- -----------------------------------------------------------------------------
CREATE TABLE class_enrollments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    
    UNIQUE(class_id, student_id)
);

COMMENT ON TABLE class_enrollments IS '학생-반 등록 관계 (다대다)';

-- 인덱스
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);


-- ============================================================================
-- 2. QUESTION BANK (문제 은행)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 questions (문제)
-- -----------------------------------------------------------------------------
-- 역할: 모든 문제를 저장하는 중앙 은행 (재사용 가능)
-- 주요 컬럼:
--   - type: mcq(객관식), short_answer(단답형), essay(서술형)
--   - options: 객관식 선지 배열 ["선지1", "선지2", ...]
--   - correct_answer: 정답 (객관식: "1"~"5", 단답형: 정답 텍스트)
--   - category: 문제 분류 (빈칸추론, 순서배열, 문법, 어휘 등)
--   - difficulty: easy, medium, hard
--   - tags: 태그 배열 (GIN 인덱스로 빠른 검색)
--   - attempt_count, correct_count: 통계 (트리거로 자동 업데이트)
-- -----------------------------------------------------------------------------
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- 문제 내용
    type            question_type NOT NULL,           -- mcq, short_answer, essay
    content         TEXT NOT NULL,                    -- 문제 본문
    passage         TEXT,                             -- 지문 (독해 문제용)
    options         JSONB,                            -- 객관식 선지 배열
    correct_answer  TEXT NOT NULL,                    -- 정답
    explanation     TEXT,                             -- 해설
    
    -- 메타데이터
    points          SMALLINT NOT NULL DEFAULT 1,      -- 기본 배점
    category        VARCHAR(50),                      -- 문제 유형
    difficulty      difficulty_level DEFAULT 'medium',-- easy, medium, hard
    tags            TEXT[] DEFAULT '{}',              -- 태그 배열
    source          VARCHAR(100),                     -- 출처
    
    -- 통계 (트리거로 자동 업데이트)
    attempt_count   INTEGER NOT NULL DEFAULT 0,       -- 응시 횟수
    correct_count   INTEGER NOT NULL DEFAULT 0,       -- 정답 횟수
    
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE questions IS '문제 은행 (재사용 가능한 중앙 저장소)';
COMMENT ON COLUMN questions.type IS 'mcq: 객관식, short_answer: 단답형, essay: 서술형';
COMMENT ON COLUMN questions.options IS '객관식 선지 배열 (JSON)';
COMMENT ON COLUMN questions.correct_answer IS '정답 - 객관식: "1"~"5", 단답형: 정답 텍스트';
COMMENT ON COLUMN questions.category IS '문제 분류 (빈칸추론, 순서배열, 문법, 어휘 등)';
COMMENT ON COLUMN questions.tags IS '태그 배열 (AI 분석/복습 세트 구성용)';

-- 인덱스
CREATE INDEX idx_questions_academy_id ON questions(academy_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);  -- 태그 배열 검색용


-- ============================================================================
-- 3. EXAMS (시험/모의고사)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 exams (시험)
-- -----------------------------------------------------------------------------
-- 역할: 모의고사 정보 저장
-- 주요 컬럼:
--   - duration: 제한 시간 (분)
--   - total_points: 총점 (트리거로 자동 계산)
--   - shuffle_questions: 문제 순서 랜덤 배치 여부
--   - show_answer_after: 제출 후 정답 공개 여부
-- -----------------------------------------------------------------------------
CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    title           VARCHAR(200) NOT NULL,            -- 시험 제목
    description     TEXT,
    
    -- 시험 설정
    duration        SMALLINT NOT NULL DEFAULT 60,     -- 제한 시간 (분)
    total_points    SMALLINT NOT NULL DEFAULT 0,      -- 총점 (자동 계산)
    pass_score      SMALLINT,                         -- 합격 점수
    
    -- 일정
    scheduled_at    TIMESTAMPTZ,                      -- 시작 예정일
    due_at          TIMESTAMPTZ,                      -- 마감일
    
    -- 옵션
    shuffle_questions   BOOLEAN NOT NULL DEFAULT false,   -- 문제 순서 셔플
    show_answer_after   BOOLEAN NOT NULL DEFAULT true,    -- 정답 공개
    allow_retry         BOOLEAN NOT NULL DEFAULT false,   -- 재응시 허용
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exams IS '시험/모의고사';
COMMENT ON COLUMN exams.duration IS '제한 시간 (분 단위)';
COMMENT ON COLUMN exams.total_points IS '총점 (exam_questions 추가 시 자동 계산)';

-- 인덱스
CREATE INDEX idx_exams_academy_id ON exams(academy_id);
CREATE INDEX idx_exams_class_id ON exams(class_id);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_scheduled_at ON exams(scheduled_at);


-- -----------------------------------------------------------------------------
-- 3.2 exam_questions (시험-문제 매핑)
-- -----------------------------------------------------------------------------
-- 역할: 시험에 어떤 문제가 포함되는지, 순서는 어떻게 되는지 관리
-- 주요 컬럼:
--   - order_index: 문제 순서 (= question_number 역할)
--   - points_override: 배점 오버라이드 (= score 역할, null이면 questions.points 사용)
-- -----------------------------------------------------------------------------
CREATE TABLE exam_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    order_index     SMALLINT NOT NULL,                -- 문제 순서 (1, 2, 3...)
    points_override SMALLINT,                         -- 배점 오버라이드
    
    UNIQUE(exam_id, question_id),
    UNIQUE(exam_id, order_index)
);

COMMENT ON TABLE exam_questions IS '시험에 포함된 문제 목록';
COMMENT ON COLUMN exam_questions.order_index IS '문제 순서 (question_number와 동일)';
COMMENT ON COLUMN exam_questions.points_override IS '배점 오버라이드 (score와 동일, null이면 원본 사용)';

-- 인덱스
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question_id ON exam_questions(question_id);


-- ============================================================================
-- 4. HOMEWORKS (숙제)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 homeworks (숙제)
-- -----------------------------------------------------------------------------
-- 역할: 숙제 정보 저장
-- 주요 컬럼:
--   - instructions: 숙제 수행 지침
--   - allow_late: 늦은 제출 허용 여부
--   - late_penalty: 늦은 제출 감점 (%)
-- -----------------------------------------------------------------------------
CREATE TABLE homeworks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    title           VARCHAR(200) NOT NULL,            -- 숙제 제목
    description     TEXT,
    instructions    TEXT,                             -- 수행 지침
    
    total_points    SMALLINT NOT NULL DEFAULT 0,      -- 총점 (자동 계산)
    due_at          TIMESTAMPTZ NOT NULL,             -- 마감일
    
    -- 옵션
    allow_late      BOOLEAN NOT NULL DEFAULT false,   -- 늦은 제출 허용
    late_penalty    SMALLINT DEFAULT 0,               -- 늦은 제출 감점 (%)
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE homeworks IS '숙제';
COMMENT ON COLUMN homeworks.late_penalty IS '늦은 제출 감점 (%)';

-- 인덱스
CREATE INDEX idx_homeworks_academy_id ON homeworks(academy_id);
CREATE INDEX idx_homeworks_class_id ON homeworks(class_id);
CREATE INDEX idx_homeworks_created_by ON homeworks(created_by);
CREATE INDEX idx_homeworks_status ON homeworks(status);
CREATE INDEX idx_homeworks_due_at ON homeworks(due_at);


-- -----------------------------------------------------------------------------
-- 4.2 homework_questions (숙제-문제 매핑)
-- -----------------------------------------------------------------------------
-- 역할: 숙제에 어떤 문제가 포함되는지 관리
-- 주요 컬럼: exam_questions와 동일한 구조
-- -----------------------------------------------------------------------------
CREATE TABLE homework_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id     UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    order_index     SMALLINT NOT NULL,                -- 문제 순서
    points_override SMALLINT,                         -- 배점 오버라이드
    
    UNIQUE(homework_id, question_id),
    UNIQUE(homework_id, order_index)
);

COMMENT ON TABLE homework_questions IS '숙제에 포함된 문제 목록';

-- 인덱스
CREATE INDEX idx_homework_questions_homework_id ON homework_questions(homework_id);
CREATE INDEX idx_homework_questions_question_id ON homework_questions(question_id);


-- ============================================================================
-- 5. ASSIGNMENTS (할당)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 exam_assignments (시험 할당)
-- -----------------------------------------------------------------------------
-- 역할: 학생별로 시험이 할당되었는지, 진행 상태는 어떤지 추적
-- 주요 컬럼:
--   - status: pending → in_progress → submitted → graded
--   - started_at, submitted_at: 시작/제출 시간 기록
-- -----------------------------------------------------------------------------
CREATE TABLE exam_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,                      -- 개별 마감일
    
    started_at      TIMESTAMPTZ,                      -- 시작 시간
    submitted_at    TIMESTAMPTZ,                      -- 제출 시간
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    UNIQUE(exam_id, student_id)
);

COMMENT ON TABLE exam_assignments IS '학생별 시험 할당';
COMMENT ON COLUMN exam_assignments.status IS 'pending → in_progress → submitted → graded';

-- 인덱스
CREATE INDEX idx_exam_assignments_exam_id ON exam_assignments(exam_id);
CREATE INDEX idx_exam_assignments_student_id ON exam_assignments(student_id);
CREATE INDEX idx_exam_assignments_status ON exam_assignments(status);


-- -----------------------------------------------------------------------------
-- 5.2 homework_assignments (숙제 할당)
-- -----------------------------------------------------------------------------
-- 역할: 학생별로 숙제가 할당되었는지 추적
-- -----------------------------------------------------------------------------
CREATE TABLE homework_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id     UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,                      -- 개별 마감일
    
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    UNIQUE(homework_id, student_id)
);

COMMENT ON TABLE homework_assignments IS '학생별 숙제 할당';

-- 인덱스
CREATE INDEX idx_homework_assignments_homework_id ON homework_assignments(homework_id);
CREATE INDEX idx_homework_assignments_student_id ON homework_assignments(student_id);
CREATE INDEX idx_homework_assignments_status ON homework_assignments(status);


-- ============================================================================
-- 6. SUBMISSIONS (제출)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 submissions (제출 기록)
-- -----------------------------------------------------------------------------
-- 역할: 학생이 시험/숙제를 제출한 기록 저장 (Polymorphic 관계)
-- 주요 컬럼:
--   - type: exam 또는 homework
--   - exam_id / homework_id: 둘 중 하나만 존재 (CHECK 제약조건)
--   - status: pending → in_progress → submitted → graded (★ 추가됨)
--   - score, max_score, percentage: 채점 결과
--   - time_spent: 소요 시간 (초)
--   - is_late: 늦은 제출 여부
-- -----------------------------------------------------------------------------
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Polymorphic 관계 (exam 또는 homework)
    type            submission_type NOT NULL,         -- exam / homework
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    homework_id     UUID REFERENCES homeworks(id) ON DELETE CASCADE,
    
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 진행 상태 (★ 추가)
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    -- 시간 기록
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    time_spent      INTEGER,                          -- 소요 시간 (초)
    
    -- 채점 결과
    score           DECIMAL(5,2),                     -- 획득 점수
    max_score       DECIMAL(5,2) NOT NULL,            -- 만점
    percentage      DECIMAL(5,2),                     -- 점수율 (%)
    
    -- 채점 정보
    graded_at       TIMESTAMPTZ,
    graded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback        TEXT,                             -- 전체 피드백
    
    is_late         BOOLEAN NOT NULL DEFAULT false,   -- 늦은 제출
    attempt_number  SMALLINT NOT NULL DEFAULT 1,      -- 재응시 번호
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 제약조건: exam_id 또는 homework_id 중 하나만 존재
    CONSTRAINT chk_submission_reference CHECK (
        (type = 'exam' AND exam_id IS NOT NULL AND homework_id IS NULL) OR
        (type = 'homework' AND homework_id IS NOT NULL AND exam_id IS NULL)
    )
);

COMMENT ON TABLE submissions IS '제출 기록 (시험/숙제 공통)';
COMMENT ON COLUMN submissions.type IS 'exam: 시험, homework: 숙제';
COMMENT ON COLUMN submissions.status IS 'pending → in_progress → submitted → graded';
COMMENT ON COLUMN submissions.time_spent IS '소요 시간 (초 단위)';

-- 인덱스
CREATE INDEX idx_submissions_exam_id ON submissions(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX idx_submissions_homework_id ON submissions(homework_id) WHERE homework_id IS NOT NULL;
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_type ON submissions(type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);


-- -----------------------------------------------------------------------------
-- 6.2 submission_answers (개별 문제 답안)
-- -----------------------------------------------------------------------------
-- 역할: 제출된 답안의 문제별 세부 정보 저장
-- 주요 컬럼:
--   - answer: 학생 답안
--   - is_correct: 정답 여부
--   - earned_points: 획득 점수
--   - ai_feedback, teacher_feedback: AI/선생님 피드백
-- -----------------------------------------------------------------------------
CREATE TABLE submission_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    
    -- 답안
    answer          TEXT,                             -- 학생 답안
    is_correct      BOOLEAN,                          -- 정답 여부
    
    -- 채점
    earned_points   DECIMAL(5,2),                     -- 획득 점수
    max_points      DECIMAL(5,2) NOT NULL,            -- 배점
    
    -- 피드백
    ai_feedback     TEXT,                             -- AI 피드백
    teacher_feedback TEXT,                            -- 선생님 피드백
    
    answered_at     TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(submission_id, question_id)
);

COMMENT ON TABLE submission_answers IS '문제별 답안';

-- 인덱스
CREATE INDEX idx_submission_answers_submission_id ON submission_answers(submission_id);
CREATE INDEX idx_submission_answers_question_id ON submission_answers(question_id);
CREATE INDEX idx_submission_answers_is_correct ON submission_answers(is_correct);


-- ============================================================================
-- 7. WRONG NOTES (오답 노트)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 wrong_notes (오답 노트)
-- -----------------------------------------------------------------------------
-- 역할: 학생별 틀린 문제 추적 및 복습 관리
-- 주요 컬럼:
--   - times_wrong: 틀린 횟수 (★ 추가)
--   - last_wrong_at: 마지막으로 틀린 시간 (★ 추가)
--   - review_count: 복습 횟수
--   - next_review_at: 다음 복습 예정일 (간격 반복 학습)
--   - mastered: 완전히 이해했는지 여부
-- 용도:
--   - "오늘의 오답 10문제" 선정
--   - "약한 영역 TOP3" 분석
--   - 간격 반복 학습 (Spaced Repetition)
-- -----------------------------------------------------------------------------
CREATE TABLE wrong_notes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- 출처 정보
    submission_type     submission_type NOT NULL,     -- exam / homework
    submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    
    -- 오답 정보
    student_answer      TEXT NOT NULL,                -- 학생이 제출한 답
    correct_answer      TEXT NOT NULL,                -- 정답
    
    -- 통계 (★ 추가/보완)
    times_wrong         SMALLINT NOT NULL DEFAULT 1,  -- 틀린 횟수
    last_wrong_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 마지막으로 틀린 시간
    
    -- 복습 추적
    review_count        SMALLINT NOT NULL DEFAULT 0,  -- 복습 횟수
    last_reviewed_at    TIMESTAMPTZ,                  -- 마지막 복습일
    next_review_at      TIMESTAMPTZ,                  -- 다음 복습 예정일
    mastered            BOOLEAN NOT NULL DEFAULT false, -- 완전 이해 여부
    mastered_at         TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 같은 문제는 한 번만 오답 노트에 등록 (업데이트로 관리)
    UNIQUE(student_id, question_id)
);

COMMENT ON TABLE wrong_notes IS '학생별 오답 노트';
COMMENT ON COLUMN wrong_notes.times_wrong IS '이 문제를 틀린 총 횟수';
COMMENT ON COLUMN wrong_notes.last_wrong_at IS '마지막으로 틀린 시간';
COMMENT ON COLUMN wrong_notes.review_count IS '복습 횟수';
COMMENT ON COLUMN wrong_notes.next_review_at IS '다음 복습 예정일 (간격 반복)';
COMMENT ON COLUMN wrong_notes.mastered IS '완전히 이해했는지 여부';

-- 인덱스
CREATE INDEX idx_wrong_notes_student_id ON wrong_notes(student_id);
CREATE INDEX idx_wrong_notes_question_id ON wrong_notes(question_id);
CREATE INDEX idx_wrong_notes_mastered ON wrong_notes(mastered);
CREATE INDEX idx_wrong_notes_next_review_at ON wrong_notes(next_review_at) WHERE mastered = false;
CREATE INDEX idx_wrong_notes_last_wrong_at ON wrong_notes(last_wrong_at);
CREATE INDEX idx_wrong_notes_times_wrong ON wrong_notes(times_wrong DESC);


-- ============================================================================
-- 8. UTILITY FUNCTIONS & TRIGGERS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 8.1 updated_at 자동 갱신 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'updated_at 컬럼 자동 갱신';

-- 각 테이블에 트리거 적용
CREATE TRIGGER trg_academies_updated_at
    BEFORE UPDATE ON academies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_homeworks_updated_at
    BEFORE UPDATE ON homeworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 8.2 시험 총점 자동 계산 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_exam_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE exams
    SET total_points = (
        SELECT COALESCE(SUM(
            COALESCE(eq.points_override, q.points)
        ), 0)
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = COALESCE(NEW.exam_id, OLD.exam_id)
    )
    WHERE id = COALESCE(NEW.exam_id, OLD.exam_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_exam_total_points IS '시험 총점 자동 계산 (exam_questions 변경 시)';

CREATE TRIGGER trg_exam_questions_total_points
    AFTER INSERT OR UPDATE OR DELETE ON exam_questions
    FOR EACH ROW EXECUTE FUNCTION update_exam_total_points();


-- -----------------------------------------------------------------------------
-- 8.3 숙제 총점 자동 계산 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_homework_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE homeworks
    SET total_points = (
        SELECT COALESCE(SUM(
            COALESCE(hq.points_override, q.points)
        ), 0)
        FROM homework_questions hq
        JOIN questions q ON q.id = hq.question_id
        WHERE hq.homework_id = COALESCE(NEW.homework_id, OLD.homework_id)
    )
    WHERE id = COALESCE(NEW.homework_id, OLD.homework_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_homework_total_points IS '숙제 총점 자동 계산 (homework_questions 변경 시)';

CREATE TRIGGER trg_homework_questions_total_points
    AFTER INSERT OR UPDATE OR DELETE ON homework_questions
    FOR EACH ROW EXECUTE FUNCTION update_homework_total_points();


-- -----------------------------------------------------------------------------
-- 8.4 문제 통계 업데이트 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_question_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_correct IS NOT NULL THEN
        UPDATE questions
        SET 
            attempt_count = attempt_count + 1,
            correct_count = correct_count + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END
        WHERE id = NEW.question_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_question_statistics IS '문제 통계 자동 업데이트 (submission_answers INSERT 시)';

CREATE TRIGGER trg_submission_answers_statistics
    AFTER INSERT ON submission_answers
    FOR EACH ROW EXECUTE FUNCTION update_question_statistics();


-- -----------------------------------------------------------------------------
-- 8.5 오답 노트 자동 생성/업데이트 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_wrong_note()
RETURNS TRIGGER AS $$
DECLARE
    v_submission_type submission_type;
    v_submission_id UUID;
    v_student_id UUID;
BEGIN
    -- 틀린 문제만 처리
    IF NEW.is_correct = false OR NEW.is_correct IS NULL THEN
        -- submission 정보 조회
        SELECT type, COALESCE(exam_id, homework_id), student_id
        INTO v_submission_type, v_submission_id, v_student_id
        FROM submissions
        WHERE id = NEW.submission_id;
        
        -- wrong_notes에 UPSERT
        INSERT INTO wrong_notes (
            student_id,
            question_id,
            submission_type,
            submission_id,
            student_answer,
            correct_answer,
            times_wrong,
            last_wrong_at
        )
        SELECT
            v_student_id,
            NEW.question_id,
            v_submission_type,
            v_submission_id,
            NEW.answer,
            q.correct_answer,
            1,
            NOW()
        FROM questions q
        WHERE q.id = NEW.question_id
        
        ON CONFLICT (student_id, question_id)
        DO UPDATE SET
            times_wrong = wrong_notes.times_wrong + 1,
            last_wrong_at = NOW(),
            submission_id = v_submission_id,
            student_answer = NEW.answer;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_wrong_note IS '틀린 문제 오답 노트 자동 등록/업데이트';

CREATE TRIGGER trg_submission_answers_wrong_note
    AFTER INSERT ON submission_answers
    FOR EACH ROW EXECUTE FUNCTION upsert_wrong_note();


-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) - Supabase Auth 연동 시 활성화
-- ============================================================================

-- 참고: 실제 배포 시 각 테이블에 RLS 정책 추가 필요
-- ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... 등

-- 예시 정책 (나중에 활성화):
-- CREATE POLICY "Students can view own submissions" ON submissions
--     FOR SELECT USING (auth.uid()::uuid = student_id);


-- ============================================================================
-- 10. 완료 메시지
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Academy AI 데이터베이스 스키마 생성 완료!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '생성된 ENUM: 6개';
    RAISE NOTICE '생성된 테이블: 13개';
    RAISE NOTICE '생성된 트리거: 8개';
    RAISE NOTICE '생성된 인덱스: 50+개';
    RAISE NOTICE '============================================';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '1. 샘플 데이터 추가 (seed.sql)';
    RAISE NOTICE '2. RLS 정책 설정';
    RAISE NOTICE '3. API 연동 테스트';
    RAISE NOTICE '============================================';
END $$;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
