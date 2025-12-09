-- ============================================================================
-- Migration: 기존 스키마 보완 (wrong_notes 개선)
-- ============================================================================

-- wrong_notes 테이블에 누락된 컬럼 추가
ALTER TABLE wrong_notes 
  ADD COLUMN IF NOT EXISTS times_wrong INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_wrong_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 wrong_count를 times_wrong으로 복사 (데이터가 있다면)
UPDATE wrong_notes SET times_wrong = wrong_count WHERE times_wrong IS NULL;

-- wrong_count 컬럼 제거 (선택사항 - times_wrong과 중복)
-- ALTER TABLE wrong_notes DROP COLUMN IF EXISTS wrong_count;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_wrong_notes_times_wrong 
  ON wrong_notes(times_wrong DESC);
  
CREATE INDEX IF NOT EXISTS idx_wrong_notes_last_wrong_at 
  ON wrong_notes(last_wrong_at DESC);

-- ============================================================================
-- 오답 노트 자동 생성/업데이트 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_wrong_note()
RETURNS TRIGGER AS $$
DECLARE
  v_assignment_type assignment_type;
  v_assignment_id UUID;
  v_student_id UUID;
BEGIN
  -- 틀린 문제만 처리
  IF NEW.is_correct = false OR NEW.is_correct IS NULL THEN
    -- submission 정보 조회
    SELECT assignment_type, assignment_id, student_id
    INTO v_assignment_type, v_assignment_id, v_student_id
    FROM submissions
    WHERE id = NEW.submission_id;
    
    -- wrong_notes에 UPSERT
    INSERT INTO wrong_notes (
      academy_id,
      student_id,
      question_id,
      wrong_count,
      times_wrong,
      first_wrong_at,
      last_wrong_at
    )
    SELECT
      s.academy_id,
      v_student_id,
      NEW.question_id,
      1,
      1,
      NOW(),
      NOW()
    FROM submissions s
    WHERE s.id = NEW.submission_id
    
    ON CONFLICT (student_id, question_id)
    DO UPDATE SET
      wrong_count = wrong_notes.wrong_count + 1,
      times_wrong = wrong_notes.times_wrong + 1,
      last_wrong_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_submission_answers_wrong_note ON submission_answers;
CREATE TRIGGER trg_submission_answers_wrong_note
  AFTER INSERT ON submission_answers
  FOR EACH ROW 
  EXECUTE FUNCTION upsert_wrong_note();

-- ============================================================================
-- 완료
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '기존 스키마 보완 완료!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '- wrong_notes에 times_wrong, last_wrong_at 추가';
  RAISE NOTICE '- 오답노트 자동 생성 트리거 추가';
  RAISE NOTICE '============================================';
END $$;
