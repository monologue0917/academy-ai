# ✅ Stage 4-2 완료: AI 해설/피드백 저장 구조

## 📋 **[요청 1] 컬럼 설계** ✅

### 최소 컬럼 구조 (MVP)

#### 1. questions 테이블

| 컬럼명 | 타입 | Nullable | 설명 |
|--------|------|----------|------|
| `ai_explanation` | TEXT | ✅ | 문제 기본 해설 (모든 학생 공통) |
| `ai_hints` | TEXT | ✅ | 힌트 (선택) |
| `ai_skill_tags` | TEXT[] | ✅ | 스킬 태그 ["어휘", "문법", "추론"] |
| `ai_generated_at` | TIMESTAMPTZ | ✅ | AI 생성 시간 |
| `ai_model` | TEXT | ✅ | 사용한 모델 (예: "gpt-4o-mini") |

**설계 이유:**
- ✅ **ai_explanation**: 한 번 생성 → N명 재사용 (비용 절감)
- ✅ **ai_skill_tags**: 배열 타입 → 약점 분석용
- ✅ **ai_generated_at, ai_model**: 추적/디버깅용

---

#### 2. submission_answers 테이블

| 컬럼명 | 타입 | Nullable | 설명 |
|--------|------|----------|------|
| `ai_feedback` | TEXT | ✅ | 학생 개별 피드백 (기존 재사용) |
| `ai_feedback_generated_at` | TIMESTAMPTZ | ✅ | 피드백 생성 시간 (추가) |

**설계 이유:**
- ✅ **ai_feedback**: 기존 컬럼 재사용 → ALTER 최소화
- ✅ **ai_feedback_generated_at**: 타임스탬프 추가만

---

### 설계 원칙

#### 1. 분리 전략 (공통 vs 개인)

```
questions.ai_explanation     → 공통 해설 (1번 생성 → N명 재사용)
                               예: "정답은 2번입니다. Paris는 프랑스의..."

submission_answers.ai_feedback → 개인 피드백 (학생마다 다름)
                                  예: "김철수님은 France와 England를 혼동하셨네요..."
```

#### 2. 비용 최적화

```
시나리오: 문제 1,000개 × 학생 100명 = 100,000 답안

[기존 방식]
- 매 답안마다 해설 생성: 100,000번 API 호출
- 비용: $200 (gpt-4o-mini 기준)

[개선 방식]
- 문제당 1번만 생성: 1,000번 (공통 해설)
- 틀린 답안만 피드백: ~20,000번 (오답률 20% 가정)
- 총: 21,000번
- 비용: $42 (79% 절감!)
```

#### 3. NULL 허용 (점진적 마이그레이션)

```
- 모든 AI 컬럼 nullable
- 기존 데이터 영향 없음
- AI 미생성 상태 허용
- 필요한 문제부터 순차적으로 생성
```

---

## 🛠️ **[요청 2] 마이그레이션/타입 구현** ✅

### 1. 마이그레이션 SQL

**파일:** `supabase/migrations/20241208090000_add_ai_columns.sql`

#### A. questions 테이블

```sql
-- 기본 해설
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_explanation TEXT NULL;

-- 힌트
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_hints TEXT NULL;

-- 스킬 태그 (배열)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_skill_tags TEXT[] DEFAULT '{}';

-- 메타데이터
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ NULL;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS ai_model TEXT NULL;

-- 인덱스 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_questions_ai_skill_tags 
ON questions USING GIN (ai_skill_tags);
```

#### B. submission_answers 테이블

```sql
-- ai_feedback 컬럼은 이미 존재 (재사용)
-- 타임스탬프만 추가
ALTER TABLE submission_answers
ADD COLUMN IF NOT EXISTS ai_feedback_generated_at TIMESTAMPTZ NULL;
```

#### C. 통계 뷰 (선택)

```sql
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
```

#### D. 롤백 스크립트

```sql
-- 롤백 시 실행:
ALTER TABLE questions DROP COLUMN IF EXISTS ai_explanation;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_hints;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_skill_tags;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_generated_at;
ALTER TABLE questions DROP COLUMN IF EXISTS ai_model;
DROP INDEX IF EXISTS idx_questions_ai_skill_tags;

ALTER TABLE submission_answers DROP COLUMN IF EXISTS ai_feedback_generated_at;

DROP VIEW IF EXISTS ai_usage_stats;
```

---

### 2. TypeScript 타입 업데이트

#### A. DbQuestion 인터페이스

```typescript
export interface DbQuestion {
  // ... 기존 필드들 ...
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // ===== AI 컬럼 (Stage 4-2) =====
  ai_explanation: string | null;        // 문제 기본 해설 (공통)
  ai_hints: string | null;              // 힌트
  ai_skill_tags: string[];              // 스킬 태그
  ai_generated_at: string | null;       // AI 생성 시간
  ai_model: string | null;              // 사용한 모델
}
```

#### B. DbSubmissionAnswer 인터페이스

```typescript
export interface DbSubmissionAnswer {
  // ... 기존 필드들 ...
  ai_feedback: string | null;           // 기존 컬럼 (재사용)
  teacher_feedback: string | null;
  answered_at: string;
  
  // ===== AI 컬럼 (Stage 4-2) =====
  ai_feedback_generated_at: string | null;  // 타임스탬프 추가
}
```

#### C. Insert/Update 타입

```typescript
export type DbQuestionInsert = Omit<
  DbQuestion, 
  'id' | 'created_at' | 'updated_at' | 'attempt_count' | 'correct_count' | 
  'ai_explanation' | 'ai_hints' | 'ai_skill_tags' | 'ai_generated_at' | 'ai_model'
> & {
  id?: string;
  ai_explanation?: string | null;
  ai_hints?: string | null;
  ai_skill_tags?: string[];
  ai_generated_at?: string | null;
  ai_model?: string | null;
};
```

#### D. Extended 타입 (선택)

```typescript
export interface QuestionWithAI extends DbQuestion {
  hasAIExplanation: boolean;  // ai_explanation != null
  hasAIHints: boolean;         // ai_hints != null
  skillTagsCount: number;      // ai_skill_tags.length
}

export interface SubmissionAnswerWithAI extends DbSubmissionAnswer {
  hasAIFeedback: boolean;      // ai_feedback != null
  question?: DbQuestion;
}
```

---

## 📝 **[요청 3] UX 정리** ✅

### 공통 해설 vs 개인 피드백 전략

#### 1. questions.ai_explanation (공통 해설)

**저장 위치:** questions 테이블

**저장 시점:** 
- 문제 생성 시 (최초 1회)
- 또는 첫 학생 제출 시 (Lazy)

**재사용 전략:**
```
문제 생성
   ↓
AI 해설 생성 (1회)
   ↓
DB 저장 (questions.ai_explanation)
   ↓
모든 학생에게 같은 해설 제공 ✅
```

**UX 효과:**
```
✅ 비용 절감 (N명 → 1번 호출)
✅ 일관된 품질
✅ 즉시 로딩 (DB 캐싱)
✅ 선생님 검토 가능 (수정 가능)
```

**활용 예시:**

```typescript
// 학생이 결과 화면에서 "해설 보기" 클릭

// 1. DB에서 question 조회 (이미 해설 있음)
const question = await supabase
  .from('questions')
  .select('*, ai_explanation, ai_hints, ai_skill_tags')
  .eq('id', questionId)
  .single();

// 2. 즉시 표시 (API 호출 없음)
if (question.ai_explanation) {
  return { explanation: question.ai_explanation }; // 캐싱된 해설
}

// 3. 없으면 생성 (첫 요청)
const result = await callTextModel(buildQuestionExplanationPrompt(...));
await supabase
  .from('questions')
  .update({ 
    ai_explanation: result.data.content,
    ai_model: 'gpt-4o-mini',
    ai_generated_at: new Date().toISOString(),
  })
  .eq('id', questionId);
```

---

#### 2. submission_answers.ai_feedback (개인 피드백)

**저장 위치:** submission_answers 테이블

**저장 시점:** 
- 시험 제출 시 (오답만)
- 또는 학생이 "피드백 보기" 클릭 시 (Lazy)

**개인화 전략:**
```
학생 제출
   ↓
채점 (is_correct = false)
   ↓
AI 개인 피드백 생성
   ↓
DB 저장 (submission_answers.ai_feedback)
   ↓
해당 학생만 볼 수 있음 ✅
```

**UX 효과:**
```
✅ 개인 맞춤 피드백
   "김철수님은 France와 England를 혼동하셨네요..."
   
✅ 오답 패턴 분석
   "이전에도 비슷한 실수를 하셨어요. 유럽 지리를 복습하세요."
   
✅ 학습 동기 부여
   "거의 정답이었어요! 다음엔 더 잘할 수 있을 거예요!"
   
✅ 학생별 진도 추적
   선생님이 학생별 피드백 히스토리 확인 가능
```

**활용 예시:**

```typescript
// 시험 제출 시 (Submit API 내부)

for (const answer of wrongAnswers) {
  // 개인 피드백 생성
  const feedbackPrompt = buildPersonalizedFeedback({
    question: answer.question,
    studentAnswer: answer.answer,
    studentName: student.name,
    previousMistakes: await getPreviousMistakes(studentId, answer.question_id),
  });

  const feedback = await callTextModel(feedbackPrompt);

  // 개별 저장
  await supabase
    .from('submission_answers')
    .update({
      ai_feedback: feedback.data.content,
      ai_feedback_generated_at: new Date().toISOString(),
    })
    .eq('id', answer.id);
}
```

---

### 시나리오 비교

#### 시나리오 1: 공통 해설만 사용

```
학생 A, B, C가 같은 문제 틀림

결과 화면:
- [공통 해설] "정답은 2번 Paris입니다. Paris는..."
- [공통 해설] "이 문제는 유럽 지리 문제입니다."

장점: 비용 저렴
단점: 개인화 없음
```

#### 시나리오 2: 개인 피드백만 사용

```
학생 A, B, C가 같은 문제 틀림

결과 화면:
- [A 전용] "철수님은 1번을 선택하셨네요. London은 영국..."
- [B 전용] "영희님은 3번을 선택하셨네요. Berlin은 독일..."
- [C 전용] "민수님은 4번을 선택하셨네요. Madrid는 스페인..."

장점: 개인화 우수
단점: 비용 높음 (3배)
```

#### 시나리오 3: 공통 + 개인 (추천!) ✅

```
학생 A, B, C가 같은 문제 틀림

결과 화면:
- [공통 해설] "정답은 2번 Paris입니다. Paris는 프랑스의 수도..."
- [A 전용 피드백] "철수님은 London을 선택하셨네요. France와 England를 혼동하신 것 같아요."
- [B 전용 피드백] "영희님은 Berlin을 선택하셨네요. 독일과 프랑스의 위치를 다시 확인해보세요."

장점: 비용 최적 + 개인화 우수 ✅
```

---

### 데이터 흐름

```
문제 생성
   ↓
questions.ai_explanation 생성 (1회, 공통)
   ↓
학생 A 제출 (오답)
   ↓
submission_answers.ai_feedback 생성 (A 전용)
   ↓
학생 B 제출 (오답)
   ↓
submission_answers.ai_feedback 생성 (B 전용)
   ↓
학생 C 제출 (정답)
   ↓
피드백 생성 안 함 (정답이므로)
```

---

### 비용 비교

**문제 100개 × 학생 50명 × 오답률 20%**

| 전략 | API 호출 횟수 | 예상 비용 |
|------|--------------|----------|
| 공통 해설만 | 100 | $0.20 |
| 개인 피드백만 | 1,000 (오답만) | $2.00 |
| **공통 + 개인** | **100 + 1,000 = 1,100** | **$2.20** |
| 모두 개인화 | 5,000 (전체) | $10.00 |

**결론:** 공통 + 개인 전략이 **비용 대비 효과 최고!**

---

## 📊 **마이그레이션 적용 방법**

### 1. Supabase CLI

```bash
# 마이그레이션 파일 생성
supabase migration new add_ai_columns

# SQL 내용 붙여넣기 (20241208090000_add_ai_columns.sql)

# 로컬 DB에 적용
supabase db push

# 또는 직접 실행
supabase db execute --file supabase/migrations/20241208090000_add_ai_columns.sql
```

### 2. Supabase Dashboard

```
1. SQL Editor 열기
2. 마이그레이션 SQL 붙여넣기
3. Run 클릭
```

### 3. 타입 자동 생성

```bash
# Supabase CLI로 타입 생성
supabase gen types typescript --local > src/types/database.ts
```

---

## ✅ **검증 체크리스트**

### SQL 확인

```sql
-- 1. questions 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'questions'
  AND column_name LIKE 'ai_%';

-- 예상 결과:
-- ai_explanation      | text         | YES
-- ai_hints            | text         | YES
-- ai_skill_tags       | ARRAY        | YES
-- ai_generated_at     | timestamptz  | YES
-- ai_model            | text         | YES

-- 2. submission_answers 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submission_answers'
  AND column_name LIKE 'ai_%';

-- 예상 결과:
-- ai_feedback                | text         | YES (기존)
-- ai_feedback_generated_at   | timestamptz  | YES (추가)

-- 3. 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'questions'
  AND indexname LIKE '%ai%';

-- 4. 통계 뷰 확인
SELECT * FROM ai_usage_stats;

-- 예상 결과:
-- questions            | 1000 | 0   | 0.00   | NULL
-- submission_answers   | 5000 | 0   | 0.00   | NULL
```

### TypeScript 확인

```bash
npm run type-check
# 또는
tsc --noEmit
```

---

## 📁 **생성된 파일 (3개)**

```
✅ supabase/migrations/20241208090000_add_ai_columns.sql  (마이그레이션)
✅ DATABASE_TYPES_UPDATE.md                               (타입 업데이트 가이드)
✅ STAGE4_2_COMPLETE.md                                   (완료 문서)
```

---

## 🚀 **다음 단계 (Stage 4-3)**

### 실제 AI 연동
1. ✅ 문제 생성 시 해설 자동 생성
2. ✅ 제출 시 개인 피드백 생성
3. ✅ 프론트엔드에서 표시

### 최적화
1. 캐싱 전략 (Redis)
2. Lazy 생성 (필요할 때만)
3. 배치 처리 (여러 문제 한번에)

---

## ✅ **Stage 4-2 완료!**

**완료 항목:**
- ✅ 컬럼 설계 (최소 MVP 구조)
- ✅ 공통 vs 개인 분리 전략
- ✅ 비용 최적화 설계
- ✅ 마이그레이션 SQL 작성
- ✅ TypeScript 타입 업데이트
- ✅ 통계 뷰 생성
- ✅ UX 효과 정리
- ✅ 검증 체크리스트

**준비 완료!** 🎉

이제 AI 해설/피드백을 효율적으로 저장하고 재사용할 수 있습니다!

```sql
-- 마이그레이션 적용
psql < supabase/migrations/20241208090000_add_ai_columns.sql

-- 통계 확인
SELECT * FROM ai_usage_stats;
```
