-- AI 해설 캐시 테이블
-- 같은 문제 + 같은 학생 답 조합이면 GPT 재호출 없이 캐시에서 가져옴

CREATE TABLE IF NOT EXISTS ai_explanations_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,  -- "{questionId}_{studentAnswer}"
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer VARCHAR(50) NOT NULL,
  correct_answer VARCHAR(50) NOT NULL,
  explanation TEXT NOT NULL,
  model VARCHAR(50) NOT NULL,  -- 'gpt-4-turbo-preview' or 'gpt-3.5-turbo'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_ai_cache_question ON ai_explanations_cache(question_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON ai_explanations_cache(created_at);

-- 30일 지난 캐시 자동 삭제 (선택사항 - cron job 필요)
-- DELETE FROM ai_explanations_cache WHERE created_at < NOW() - INTERVAL '30 days';
