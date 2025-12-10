-- ============================================================================
-- Academy AI - Database Schema Migration (최종 보완 버전)
-- 수능/내신 영어 학원용 모의고사·숙제 전용 앱
-- ============================================================================
-- Supabase (PostgreSQL) 마이그레이션
-- 생성일: 2024-12-08
-- 버전: v2.1 (UUID 확장 라인 수정)
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS & CUSTOM TYPES (ENUM)
-- ============================================================================

-- UUID extension (Supabase has this enabled by default)

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
    code        VARCHAR(20) NOT NULL UNIQUE,
    logo_url    TEXT,
    settings    JSONB DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academies IS '학원 정보';
COMMENT ON COLUMN academies.code IS '학생 입장 코드';


-- -----------------------------------------------------------------------------
-- 1.2 users (사용자)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20),
    name            VARCHAR(50) NOT NULL,
    role            user_role NOT NULL,
    password_hash   TEXT,
    profile_image   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS '사용자 (선생님, 학생)';

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
    schedule    JSONB DEFAULT '[]',
    color       VARCHAR(7),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE classes IS '수업 반';

CREATE INDEX idx_classes_academy_id ON classes(academy_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);


-- -----------------------------------------------------------------------------
-- 1.4 class_enrollments (반 등록)
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

CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);


-- ============================================================================
-- 2. QUESTION BANK
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 questions (문제)
-- -----------------------------------------------------------------------------
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id      UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    type            question_type NOT NULL,
    content         TEXT NOT NULL,
    passage         TEXT,
    options         JSONB,
    correct_answer  TEXT NOT NULL,
    explanation     TEXT,
    
    points          SMALLINT NOT NULL DEFAULT 1,
    category        VARCHAR(50),
    difficulty      difficulty_level DEFAULT 'medium',
    tags            TEXT[] DEFAULT '{}',
    source          VARCHAR(100),
    
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE questions IS '문제 은행';

CREATE INDEX idx_questions_academy_id ON questions(academy_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);


-- ============================================================================
-- 3. EXAMS
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
    
    duration        SMALLINT NOT NULL DEFAULT 60,
    total_points    SMALLINT NOT NULL DEFAULT 0,
    pass_score      SMALLINT,
    
    scheduled_at    TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    
    shuffle_questions   BOOLEAN NOT NULL DEFAULT false,
    show_answer_after   BOOLEAN NOT NULL DEFAULT true,
    allow_retry         BOOLEAN NOT NULL DEFAULT false,
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exams IS '시험/모의고사';

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
    order_index     SMALLINT NOT NULL,
    points_override SMALLINT,
    
    UNIQUE(exam_id, question_id),
    UNIQUE(exam_id, order_index)
);

COMMENT ON TABLE exam_questions IS '시험에 포함된 문제';

CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question_id ON exam_questions(question_id);


-- ============================================================================
-- 4. HOMEWORKS
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
    instructions    TEXT,
    
    total_points    SMALLINT NOT NULL DEFAULT 0,
    due_at          TIMESTAMPTZ NOT NULL,
    
    allow_late      BOOLEAN NOT NULL DEFAULT false,
    late_penalty    SMALLINT DEFAULT 0,
    
    status          content_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE homeworks IS '숙제';

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

COMMENT ON TABLE homework_questions IS '숙제에 포함된 문제';

CREATE INDEX idx_homework_questions_homework_id ON homework_questions(homework_id);
CREATE INDEX idx_homework_questions_question_id ON homework_questions(question_id);


-- ============================================================================
-- 5. ASSIGNMENTS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 exam_assignments (시험 할당)
-- -----------------------------------------------------------------------------
CREATE TABLE exam_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,
    
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    UNIQUE(exam_id, student_id)
);

COMMENT ON TABLE exam_assignments IS '학생별 시험 할당';

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
    due_at          TIMESTAMPTZ,
    
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    UNIQUE(homework_id, student_id)
);

COMMENT ON TABLE homework_assignments IS '학생별 숙제 할당';

CREATE INDEX idx_homework_assignments_homework_id ON homework_assignments(homework_id);
CREATE INDEX idx_homework_assignments_student_id ON homework_assignments(student_id);
CREATE INDEX idx_homework_assignments_status ON homework_assignments(status);


-- ============================================================================
-- 6. SUBMISSIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 submissions (제출 기록)
-- -----------------------------------------------------------------------------
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    type            submission_type NOT NULL,
    exam_id         UUID REFERENCES exams(id) ON DELETE CASCADE,
    homework_id     UUID REFERENCES homeworks(id) ON DELETE CASCADE,
    
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    status          assignment_status NOT NULL DEFAULT 'pending',
    
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    time_spent      INTEGER,
    
    score           DECIMAL(5,2),
    max_score       DECIMAL(5,2) NOT NULL,
    percentage      DECIMAL(5,2),
    
    graded_at       TIMESTAMPTZ,
    graded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback        TEXT,
    
    is_late         BOOLEAN NOT NULL DEFAULT false,
    attempt_number  SMALLINT NOT NULL DEFAULT 1,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_submission_reference CHECK (
        (type = 'exam' AND exam_id IS NOT NULL AND homework_id IS NULL) OR
        (type = 'homework' AND homework_id IS NOT NULL AND exam_id IS NULL)
    )
);

COMMENT ON TABLE submissions IS '제출 기록';

CREATE INDEX idx_submissions_exam_id ON submissions(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX idx_submissions_homework_id ON submissions(homework_id) WHERE homework_id IS NOT NULL;
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_type ON submissions(type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);


-- -----------------------------------------------------------------------------
-- 6.2 submission_answers (개별 문제 답안)
-- -----------------------------------------------------------------------------
CREATE TABLE submission_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    
    answer          TEXT,
    is_correct      BOOLEAN,
    
    earned_points   DECIMAL(5,2),
    max_points      DECIMAL(5,2) NOT NULL,
    
    ai_feedback     TEXT,
    teacher_feedback TEXT,
    
    answered_at     TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(submission_id, question_id)
);

COMMENT ON TABLE submission_answers IS '문제별 답안';

CREATE INDEX idx_submission_answers_submission_id ON submission_answers(submission_id);
CREATE INDEX idx_submission_answers_question_id ON submission_answers(question_id);
CREATE INDEX idx_submission_answers_is_correct ON submission_answers(is_correct);


-- ============================================================================
-- 7. WRONG NOTES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 wrong_notes (오답 노트)
-- -----------------------------------------------------------------------------
CREATE TABLE wrong_notes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    submission_type     submission_type NOT NULL,
    submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    
    student_answer      TEXT NOT NULL,
    correct_answer      TEXT NOT NULL,
    
    times_wrong         SMALLINT NOT NULL DEFAULT 1,
    last_wrong_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    review_count        SMALLINT NOT NULL DEFAULT 0,
    last_reviewed_at    TIMESTAMPTZ,
    next_review_at      TIMESTAMPTZ,
    mastered            BOOLEAN NOT NULL DEFAULT false,
    mastered_at         TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, question_id)
);

COMMENT ON TABLE wrong_notes IS '학생별 오답 노트';

CREATE INDEX idx_wrong_notes_student_id ON wrong_notes(student_id);
CREATE INDEX idx_wrong_notes_question_id ON wrong_notes(question_id);
CREATE INDEX idx_wrong_notes_mastered ON wrong_notes(mastered);
CREATE INDEX idx_wrong_notes_next_review_at ON wrong_notes(next_review_at) WHERE mastered = false;
CREATE INDEX idx_wrong_notes_last_wrong_at ON wrong_notes(last_wrong_at);
CREATE INDEX idx_wrong_notes_times_wrong ON wrong_notes(times_wrong DESC);


-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 8.1 updated_at 자동 갱신
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- 8.2 시험 총점 자동 계산
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
-- 8.3 숙제 총점 자동 계산
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
-- 8.4 문제 통계 업데이트
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


-- -----------------------------------------------------------------------------
-- 8.5 오답 노트 자동 생성/업데이트
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_wrong_note()
RETURNS TRIGGER AS $$
DECLARE
    v_submission_type submission_type;
    v_submission_id UUID;
    v_student_id UUID;
BEGIN
    IF NEW.is_correct = false OR NEW.is_correct IS NULL THEN
        SELECT type, COALESCE(exam_id, homework_id), student_id
        INTO v_submission_type, v_submission_id, v_student_id
        FROM submissions
        WHERE id = NEW.submission_id;
        
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

CREATE TRIGGER trg_submission_answers_wrong_note
    AFTER INSERT ON submission_answers
    FOR EACH ROW EXECUTE FUNCTION upsert_wrong_note();


-- ============================================================================
-- 완료
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Academy AI 데이터베이스 스키마 생성 완료!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ENUM: 6개';
    RAISE NOTICE '테이블: 13개';
    RAISE NOTICE '트리거: 8개';
    RAISE NOTICE '인덱스: 50+개';
    RAISE NOTICE '============================================';
END $$;


-- END OF MIGRATION
