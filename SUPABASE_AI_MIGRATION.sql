-- ============================================
-- Migration: Add AI explanation and feedback columns
-- Created: 2024-12-08
-- Purpose: Store AI-generated explanations and personalized feedback
-- ============================================

-- ============================================
-- 1. questions 테이블 - AI 해설 컬럼 추가
-- ============================================

-- 기본 해설 (모든 학생 공통)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_explanation TEXT NULL;

-- 힌트 (선택)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_hints TEXT NULL;

-- 스킬 태그 (배열)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_skill_tags TEXT[] DEFAULT '{}';

-- AI 메타데이터
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ NULL;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_model TEXT NULL;

-- 인덱스 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_questions_ai_skill_tags 
ON questions USING GIN (ai_skill_tags);

-- 코멘트
COMMENT ON COLUMN questions.ai_explanation IS '문제 기본 해설 (모든 학생 공통, AI 생성)';
COMMENT ON COLUMN questions.ai_hints IS '문제 힌트 (선택)';
COMMENT ON COLUMN questions.ai_skill_tags IS '스킬 태그 배열 (예: ["어휘", "문법", "추론"])';
COMMENT ON COLUMN questions.ai_generated_at IS 'AI 해설 생성 시간';
COMMENT ON COLUMN questions.ai_model IS '사용한 AI 모델 (예: "gpt-4o-mini")';

-- ============================================
-- 2. submission_answers 테이블 - AI 피드백 타임스탬프 추가
-- ============================================

-- ai_feedback 컬럼은 이미 존재 (재사용)
-- 타임스탬프만 추가
ALTER TABLE submission_answers
ADD COLUMN IF NOT EXISTS ai_feedback_generated_at TIMESTAMPTZ NULL;

-- 코멘트
COMMENT ON COLUMN submission_answers.ai_feedback IS '학생 개별 AI 피드백 (오답 시)';
COMMENT ON COLUMN submission_answers.ai_feedback_generated_at IS 'AI 피드백 생성 시간';

-- ============================================
-- 3. 통계 뷰 (선택) - AI 사용 현황 추적
-- ============================================

CREATE OR REPLACE VIEW ai_usage_stats AS
SELECT
  'questions' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(ai_explanation) AS ai_generated_count,
  ROUND(COUNT(ai_explanation)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) AS ai_coverage_percent,
  MAX(ai_generated_at) AS last_generated_at
FROM questions
UNION ALL
SELECT
  'submission_answers' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(ai_feedback) AS ai_generated_count,
  ROUND(COUNT(ai_feedback)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) AS ai_coverage_percent,
  MAX(ai_feedback_generated_at) AS last_generated_at
FROM submission_answers;

COMMENT ON VIEW ai_usage_stats IS 'AI 생성 컨텐츠 사용 통계';

-- ============================================
-- 4. 검증 쿼리 (실행 후 확인용)
-- ============================================

-- 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('questions', 'submission_answers')
  AND column_name LIKE 'ai_%'
ORDER BY table_name, ordinal_position;

-- 통계 확인
SELECT * FROM ai_usage_stats;
