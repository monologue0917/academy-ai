# Supabase AI Migration 실행 가이드

## 🎯 **빠른 실행 (3분)**

### 방법 1: Supabase Dashboard (추천 ⭐)

```
1. https://supabase.com/dashboard 접속

2. 프로젝트 선택

3. 좌측 메뉴 → "SQL Editor" 클릭

4. "New query" 버튼

5. SUPABASE_AI_MIGRATION.sql 파일 내용 복사 & 붙여넣기

6. "Run" 버튼 (또는 Ctrl+Enter)

7. 성공 확인:
   ✅ Success. No rows returned
```

---

### 방법 2: Supabase CLI (로컬)

```bash
# 1. 프로젝트 폴더로 이동
cd /mnt/c/Users/dueb0/OneDrive/바탕\ 화면/학원어플/academy-ai

# 2. 마이그레이션 파일 확인
ls supabase/migrations/

# 3. 실행
supabase db push

# 또는 특정 파일 실행
supabase db execute --file supabase/migrations/20241208090000_add_ai_columns.sql
```

---

## ✅ **실행 후 확인**

### 1. 컬럼 확인

Supabase Dashboard → SQL Editor → 다음 쿼리 실행:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('questions', 'submission_answers')
  AND column_name LIKE 'ai_%'
ORDER BY table_name, ordinal_position;
```

**예상 결과:**

```
table_name          | column_name               | data_type | is_nullable | column_default
--------------------+---------------------------+-----------+-------------+----------------
questions           | ai_explanation            | text      | YES         | NULL
questions           | ai_hints                  | text      | YES         | NULL
questions           | ai_skill_tags             | ARRAY     | YES         | '{}'::text[]
questions           | ai_generated_at           | timestamp | YES         | NULL
questions           | ai_model                  | text      | YES         | NULL
submission_answers  | ai_feedback_generated_at  | timestamp | YES         | NULL
```

---

### 2. 통계 뷰 확인

```sql
SELECT * FROM ai_usage_stats;
```

**예상 결과:**

```
table_name          | total_rows | ai_generated_count | ai_coverage_percent | last_generated_at
--------------------+------------+--------------------+---------------------+------------------
questions           | 0          | 0                  | 0.00                | NULL
submission_answers  | 0          | 0                  | 0.00                | NULL
```

---

### 3. 인덱스 확인

```sql
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'questions'
  AND indexname LIKE '%ai%';
```

**예상 결과:**

```
indexname                      | indexdef
-------------------------------+---------------------------------------
idx_questions_ai_skill_tags    | CREATE INDEX idx_questions_ai_skill_tags ON questions USING gin (ai_skill_tags)
```

---

## ⚠️ **주의사항**

### 1. bash 명령어 제거

❌ **잘못된 예:**
```bash
mkdir -p "/mnt/c/Users/..." && cat > "..." << 'ENDOFFILE'
ALTER TABLE questions...
ENDOFFILE
```

✅ **올바른 예:**
```sql
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_explanation TEXT NULL;
```

---

### 2. 기존 데이터 영향 없음

```
✅ IF NOT EXISTS 사용 → 이미 있으면 스킵
✅ NULL 허용 → 기존 row 영향 없음
✅ DEFAULT '{}' → 기본값 자동 설정
```

---

### 3. 롤백 (필요 시)

만약 문제가 생기면:

```sql
-- questions 테이블
ALTER TABLE questions DROP COLUMN IF EXISTS ai_explanation;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_hints;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_skill_tags;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_generated_at;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_model;
DROP INDEX IF EXISTS idx_questions_ai_skill_tags;

-- submission_answers 테이블
ALTER TABLE submission_answers DROP COLUMN IF EXISTS ai_feedback_generated_at;

-- 뷰
DROP VIEW IF EXISTS ai_usage_stats;
```

---

## 🎊 **완료 체크리스트**

- [ ] SQL 복사 완료
- [ ] Supabase Dashboard 접속
- [ ] SQL Editor에서 실행
- [ ] "Success" 메시지 확인
- [ ] 컬럼 확인 쿼리 실행 (6개 컬럼 확인)
- [ ] 통계 뷰 확인 (2개 row)
- [ ] 인덱스 확인 (1개)

---

## 💡 **Tip**

### 빠른 복사 (Windows)

```
1. SUPABASE_AI_MIGRATION.sql 파일 열기
2. Ctrl+A (전체 선택)
3. Ctrl+C (복사)
4. Supabase SQL Editor에 붙여넣기 (Ctrl+V)
5. Run (Ctrl+Enter)
```

### 검증 쿼리 한 번에 실행

```sql
-- 1. 컬럼
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'questions' AND column_name LIKE 'ai_%';

-- 2. 통계
SELECT * FROM ai_usage_stats;

-- 3. 인덱스
SELECT indexname FROM pg_indexes 
WHERE tablename = 'questions' AND indexname LIKE '%ai%';
```

**모두 성공하면 완료!** 🎉
