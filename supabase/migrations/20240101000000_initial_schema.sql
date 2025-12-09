-- ============================================================================
-- Academy AI - Database Schema Migration
-- 수능/내신 영어 학원용 모의고사·숙제 전용 앱
-- ============================================================================
-- Supabase (PostgreSQL) 마이그레이션
-- 생성일: 2024
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
CREATE TABLE academies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20) NOT NULL UNIQUE,  -- 학원 입장 코드
    logo_url    TEXT,
    settings    JSONB DEFAULT '{}',           -- 학원별 설정 (추후 확장)
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academies IS '학원 정보';
COMMENT ON COLUMN academies.code IS '학생이 입장할 때 사용하는 고유 코드';
COMMENT ON COLUMN academies.settings IS '학원별 커스텀 설정 (JSON)';


-- -----------------------------------------------------------------------------
-- 1.2 users (사용자: 선생님/학생)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE,           -- 선생님은 필수, 학생은 선택
    phone           VARCHAR(20),
    name            VARCHAR(50) NOT NULL,
    role            user_role NOT NULL,
    password_hash   TEXT,                          -- 학생: 간단한 PIN 등, 선생님: 실제 비밀번호
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
CREATE TABLE classes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    schedule    JSONB DEFAULT '[]',      -- [{ day, startTime, endTime, room, note }]
    color       VARCHAR(7),              -- HEX 색상 코드 (예: #4F46E5)
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
CREATE TABLE class_enrollments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    
    UNIQUE(class_id, student_id)
);

COMMENT ON TABLE class_enrollments IS '학생-반 등록 관계';

-- 인덱스
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);


-- ============================================================================
-- 2. QUESTION BANK (문제 은행)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 questions (문제)
-- -----------------------------------------------------------------------------
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- 문제 내용
    type            question_type NOT NULL,
    content         TEXT NOT NULL,                 -- 문제 본문
    passage         TEXT,                          -- 지문 (독해 문제용)
    options         JSONB,                         -- 객관식: ["선지1", "선지2", "선지3", "선지4", "선지5"]
    correct_answer  TEXT NOT NULL,                 -- 정답 (객관식: "1"~"5", 단답형: 정답 텍스트)
    explanation     TEXT,                          -- 해설
    
    -- 메타데이터
    points          SMALLINT NOT NULL DEFAULT 1,   -- 배점
    category        VARCHAR(50),                   -- 문제 유형 (빈칸추론, 순서배열, 문법 등)
    difficulty      difficulty_level DEFAULT 'medium',
    tags            TEXT[] DEFAULT '{}',           -- 태그 배열
    source          VARCHAR(100),                  -- 출처 (예: "2024 9월 모평 21번")
    
    -- 통계 (나중에 트리거로 업데이트)
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE questions IS '문제 은행';
COMMENT ON COLUMN questions.options IS '객관식 선지 배열 (JSON)';
COMMENT ON COLUMN questions.correct_answer IS '정답 - 객관식은 "1"~"5", 단답형은 정답 텍스트';
COMMENT ON COLUMN questions.category IS '문제 유형 분류 (어휘, 문법, 빈칸추론, 순서배열 등)';

-- 인덱스
CREATE INDEX idx_questions_academy_id ON questions(academy_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);


-- ============================================================================
-- 3. EXAMS (시험/모의고사)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 exams (시험)
-- -----------------------------------------------------------------------------
CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    
    -- 시험 설정
    duration        SMALLINT NOT NULL DEFAULT 60,  -- 제한 시간 (분)
    total_points    SMALLINT NOT NULL DEFAULT 0,   -- 총점 (문제 추가 시 계산)
    pass_score      SMALLINT,                      -- 합격 점수 (선택)
    
    -- 일정
    scheduled_at    TIMESTAMPTZ,                   -- 시험 시작 예정일
    due_at          TIMESTAMPTZ,                   -- 마감일
    
    -- 옵션
    shuffle_questions   BOOLEAN NOT NULL DEFAULT false,  -- 문제 순서 셔플
    show_answer_after   BOOLEAN NOT NULL DEFAULT true,   -- 제출 후 정답 표시
    allow_retry         BOOLEAN NOT NULL DEFAULT false,  -- 재응시 허용
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exams IS '시험/모의고사';
COMMENT ON COLUMN exams.duration IS '제한 시간 (분 단위)';

-- 인덱스
CREATE INDEX idx_exams_academy_id ON exams(academy_id);
CREATE INDEX idx_exams_class_id ON exams(class_id);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_scheduled_at ON exams(scheduled_at);


-- -----------------------------------------------------------------------------
-- 3.2 exam_questions (시험-문제 매핑)
-- -----------------------------------------------------------------------------
CREATE TABLE exam_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    order_index     SMALLINT NOT NULL,             -- 문제 순서
    points_override SMALLINT,                      -- 배점 오버라이드 (null이면 원본 사용)
    
    UNIQUE(exam_id, question_id),
    UNIQUE(exam_id, order_index)
);

COMMENT ON TABLE exam_questions IS '시험에 포함된 문제들';

-- 인덱스
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question_id ON exam_questions(question_id);


-- ============================================================================
-- 4. HOMEWORKS (숙제)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 homeworks (숙제)
-- -----------------------------------------------------------------------------
CREATE TABLE homeworks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    instructions    TEXT,                          -- 숙제 수행 지침
    
    total_points    SMALLINT NOT NULL DEFAULT 0,
    due_at          TIMESTAMPTZ NOT NULL,          -- 마감일
    
    -- 옵션
    allow_late      BOOLEAN NOT NULL DEFAULT false,      -- 늦은 제출 허용
    late_penalty    SMALLINT DEFAULT 0,                  -- 늦은 제출 감점 (%)
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE homeworks IS '숙제';

-- 인덱스
CREATE INDEX idx_homeworks_academy_id ON homeworks(academy_id);
CREATE INDEX idx_homeworks_class_id ON homeworks(class_id);
CREATE INDEX idx_homeworks_created_by ON homeworks(created_by);
CREATE INDEX idx_homeworks_status ON homeworks(status);
CREATE INDEX idx_homeworks_due_at ON homeworks(due_at);


-- -----------------------------------------------------------------------------
-- 4.2 homework_questions (숙제-문제 매핑)
-- -----------------------------------------------------------------------------
CREATE TABLE homework_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id     UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    order_index     SMALLINT NOT NULL,
    points_override SMALLINT,
    
    UNIQUE(homework_id, question_id),
    UNIQUE(homework_id, order_index)
);

COMMENT ON TABLE homework_questions IS '숙제에 포함된 문제들';

-- 인덱스
CREATE INDEX idx_homework_questions_homework_id ON homework_questions(homework_id);
CREATE INDEX idx_homework_questions_question_id ON homework_questions(question_id);


-- ============================================================================
-- 5. ASSIGNMENTS (할당)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 exam_assignments (시험 할당)
-- -----------------------------------------------------------------------------
CREATE TABLE exam_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,                   -- 개별 마감일 (null이면 시험 기본 마감일)
    
    started_at      TIMESTAMPTZ,                   -- 시험 시작 시간
    submitted_at    TIMESTAMPTZ,                   -- 제출 시간
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    UNIQUE(exam_id, student_id)
);

COMMENT ON TABLE exam_assignments IS '학생별 시험 할당';

-- 인덱스
CREATE INDEX idx_exam_assignments_exam_id ON exam_assignments(exam_id);
CREATE INDEX idx_exam_assignments_student_id ON exam_assignments(student_id);
CREATE INDEX idx_exam_assignments_status ON exam_assignments(status);


-- -----------------------------------------------------------------------------
-- 5.2 homework_assignments (숙제 할당)
-- -----------------------------------------------------------------------------
CREATE TABLE homework_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id     UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,                   -- 개별 마감일
    
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
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Polymorphic 관계 (exam 또는 homework)
    type            submission_type NOT NULL,
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    homework_id     UUID REFERENCES homeworks(id) ON DELETE CASCADE,
    
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 시간 기록
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    time_spent      INTEGER,                       -- 소요 시간 (초)
    
    -- 채점 결과
    score           DECIMAL(5,2),                  -- 획득 점수
    max_score       DECIMAL(5,2) NOT NULL,         -- 만점
    percentage      DECIMAL(5,2),                  -- 점수율 (%)
    
    -- 채점 정보
    graded_at       TIMESTAMPTZ,
    graded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback        TEXT,                          -- 전체 피드백
    
    is_late         BOOLEAN NOT NULL DEFAULT false,
    attempt_number  SMALLINT NOT NULL DEFAULT 1,   -- 재응시 번호
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 제약조건: exam_id 또는 homework_id 중 하나만 존재
    CONSTRAINT chk_submission_reference CHECK (
        (type = 'exam' AND exam_id IS NOT NULL AND homework_id IS NULL) OR
        (type = 'homework' AND homework_id IS NOT NULL AND exam_id IS NULL)
    )
);

COMMENT ON TABLE submissions IS '제출 기록';
COMMENT ON COLUMN submissions.time_spent IS '소요 시간 (초 단위)';

-- 인덱스
CREATE INDEX idx_submissions_exam_id ON submissions(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX idx_submissions_homework_id ON submissions(homework_id) WHERE homework_id IS NOT NULL;
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_type ON submissions(type);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);


-- -----------------------------------------------------------------------------
-- 6.2 submission_answers (개별 문제 답안)
-- -----------------------------------------------------------------------------
CREATE TABLE submission_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    
    -- 답안
    answer          TEXT,                          -- 학생 답안
    is_correct      BOOLEAN,                       -- 정답 여부
    
    -- 채점
    earned_points   DECIMAL(5,2),                  -- 획득 점수
    max_points      DECIMAL(5,2) NOT NULL,         -- 배점
    
    -- AI 피드백 / 선생님 피드백
    ai_feedback     TEXT,
    teacher_feedback TEXT,
    
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

CREATE TABLE wrong_notes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- 출처 정보
    submission_type     submission_type NOT NULL,
    submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    
    -- 오답 정보
    student_answer      TEXT NOT NULL,
    correct_answer      TEXT NOT NULL,
    
    -- 복습 추적
    review_count        SMALLINT NOT NULL DEFAULT 0,
    last_reviewed_at    TIMESTAMPTZ,
    next_review_at      TIMESTAMPTZ,                -- 다음 복습 예정일 (간격 반복)
    mastered            BOOLEAN NOT NULL DEFAULT false,
    mastered_at         TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 같은 문제는 한 번만 오답 노트에 등록 (업데이트로 관리)
    UNIQUE(student_id, question_id)
);

COMMENT ON TABLE wrong_notes IS '학생별 오답 노트';
COMMENT ON COLUMN wrong_notes.review_count IS '복습 횟수';
COMMENT ON COLUMN wrong_notes.mastered IS '완전히 이해했는지 여부';

-- 인덱스
CREATE INDEX idx_wrong_notes_student_id ON wrong_notes(student_id);
CREATE INDEX idx_wrong_notes_question_id ON wrong_notes(question_id);
CREATE INDEX idx_wrong_notes_mastered ON wrong_notes(mastered);
CREATE INDEX idx_wrong_notes_next_review_at ON wrong_notes(next_review_at) WHERE mastered = false;


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

CREATE TRIGGER trg_submission_answers_statistics
    AFTER INSERT ON submission_answers
    FOR EACH ROW EXECUTE FUNCTION update_question_statistics();


-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) - Supabase Auth 연동 시 활성화
-- ============================================================================

-- 참고: 실제 배포 시 각 테이블에 RLS 정책 추가 필요
-- ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... 등

-- 예시 정책 (나중에 활성화):
-- CREATE POLICY "Users can view own academy" ON users
--     FOR SELECT USING (auth.uid()::uuid = id);


-- ============================================================================
-- 10. SAMPLE DATA (개발용 - 필요시 별도 시드 파일로 분리)
-- ============================================================================

-- 샘플 데이터는 별도의 seed.sql 파일로 관리 권장


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
