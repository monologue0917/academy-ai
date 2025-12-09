# 🔍 Database Schema vs TypeScript Types 비교 분석

## ❌ **발견된 불일치 사항**

### 1. **submissions 테이블** - `status` 컬럼 누락 ⚠️

**실제 DB (20240101000000_initial_schema.sql):**
```sql
CREATE TABLE submissions (
    ...
    type            submission_type NOT NULL,
    exam_id         UUID,
    homework_id     UUID,
    student_id      UUID NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    time_spent      INTEGER,
    score           DECIMAL(5,2),
    max_score       DECIMAL(5,2) NOT NULL,
    ...
    -- ❌ status 컬럼 없음!
)
```

**TypeScript 타입 (database.ts):**
```typescript
export interface DbSubmission {
  ...
  status: AssignmentStatus;  // ❌ 실제 DB에 없는 컬럼!
  ...
}
```

**해결방법:**
- TypeScript에서 `status` 제거
- 또는 DB에 `status` 컬럼 추가

---

### 2. **class_enrollments 테이블** - `created_at`, `updated_at` 누락 ⚠️

**실제 DB:**
```sql
CREATE TABLE class_enrollments (
    id          UUID,
    class_id    UUID,
    student_id  UUID,
    enrolled_at TIMESTAMPTZ,
    is_active   BOOLEAN
    -- ❌ created_at, updated_at 없음
);
```

**TypeScript 타입:**
```typescript
export interface DbClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  is_active: boolean;
  // ✅ created_at, updated_at 없음 (일치)
}
```

**상태:** ✅ 일치함

---

### 3. **exam_questions / homework_questions** - `created_at` 누락 ⚠️

**실제 DB:**
```sql
CREATE TABLE exam_questions (
    id              UUID,
    exam_id         UUID,
    question_id     UUID,
    order_index     SMALLINT,
    points_override SMALLINT
    -- ❌ created_at 없음
);
```

**TypeScript 타입:**
```typescript
export interface DbExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
  points_override: number | null;
  // ✅ created_at 없음 (일치)
}
```

**상태:** ✅ 일치함

---

### 4. **submission_answers** - `created_at`, `updated_at` 누락 ⚠️

**실제 DB:**
```sql
CREATE TABLE submission_answers (
    ...
    answered_at     TIMESTAMPTZ DEFAULT NOW()
    -- ❌ created_at, updated_at 없음
);
```

**TypeScript 타입:**
```typescript
export interface DbSubmissionAnswer {
  ...
  answered_at: string;
  // ✅ created_at, updated_at 없음 (일치)
}
```

**상태:** ✅ 일치함

---

## ✅ **정확히 일치하는 테이블**

### 1. **academies** ✅
- 모든 컬럼 일치
- JSONB 타입 → `Record<string, unknown>`

### 2. **users** ✅
- 모든 컬럼 일치
- `role: user_role` → `UserRole`

### 3. **classes** ✅
- 모든 컬럼 일치
- `schedule: JSONB` → `ClassScheduleItem[]`

### 4. **questions** ✅
- 모든 컬럼 일치
- `options: JSONB` → `string[] | null`
- `tags: TEXT[]` → `string[]`

### 5. **exams** ✅
- 모든 컬럼 일치

### 6. **homeworks** ✅
- 모든 컬럼 일치

### 7. **exam_assignments** ✅
- 모든 컬럼 일치

### 8. **homework_assignments** ✅
- 모든 컬럼 일치

---

## 🔧 **수정이 필요한 부분**

### 수정 1: `DbSubmission` - status 컬럼 제거

**변경 전:**
```typescript
export interface DbSubmission {
  id: string;
  type: SubmissionType;
  exam_id: string | null;
  homework_id: string | null;
  student_id: string;
  status: AssignmentStatus;  // ❌ 제거 필요
  started_at: string;
  submitted_at: string | null;
  ...
}
```

**변경 후:**
```typescript
export interface DbSubmission {
  id: string;
  type: SubmissionType;
  exam_id: string | null;
  homework_id: string | null;
  student_id: string;
  // status 제거됨
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
```

---

### 수정 2: `DbWrongNote` - 실제 DB와 비교

**실제 DB (Supabase 스크린샷 기준):**
```
- wrong_count (실제 DB에 있음)
- times_wrong (보완 SQL로 추가됨)
- first_wrong_at (실제 DB에 있음)
- last_wrong_at (실제 DB에 있음)
```

**TypeScript 타입:**
```typescript
export interface DbWrongNote {
  id: string;
  student_id: string;
  question_id: string;
  submission_type: SubmissionType;
  submission_id: string;
  student_answer: string;
  correct_answer: string;
  review_count: number;  // ✅ 있음
  last_reviewed_at: string | null;
  next_review_at: string | null;
  mastered: boolean;  // ✅ 있음
  mastered_at: string | null;
  created_at: string;
  // ❌ wrong_count, times_wrong, first_wrong_at 누락
}
```

**변경 후:**
```typescript
export interface DbWrongNote {
  id: string;
  student_id: string;
  question_id: string;
  submission_type: SubmissionType;
  submission_id: string;
  student_answer: string;
  correct_answer: string;
  wrong_count: number;  // ✅ 추가
  times_wrong: number;  // ✅ 추가
  first_wrong_at: string;  // ✅ 추가
  last_wrong_at: string;  // ✅ 추가
  review_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  mastered: boolean;
  mastered_at: string | null;
  created_at: string;
  updated_at: string;  // ✅ 추가
}
```

---

## 📊 **전체 요약**

| 테이블 | 상태 | 수정 필요 여부 |
|--------|------|---------------|
| academies | ✅ 완벽 일치 | ❌ |
| users | ✅ 완벽 일치 | ❌ |
| classes | ✅ 완벽 일치 | ❌ |
| class_enrollments | ✅ 완벽 일치 | ❌ |
| questions | ✅ 완벽 일치 | ❌ |
| exams | ✅ 완벽 일치 | ❌ |
| exam_questions | ✅ 완벽 일치 | ❌ |
| homeworks | ✅ 완벽 일치 | ❌ |
| homework_questions | ✅ 완벽 일치 | ❌ |
| exam_assignments | ✅ 완벽 일치 | ❌ |
| homework_assignments | ✅ 완벽 일치 | ❌ |
| **submissions** | ⚠️ 불일치 | ✅ `status` 제거 |
| submission_answers | ✅ 완벽 일치 | ❌ |
| **wrong_notes** | ⚠️ 불일치 | ✅ 4개 컬럼 추가 |

---

## 🎯 **최종 수정 사항**

### 1. submissions 테이블
- `status` 컬럼 제거 (DB에 없음)

### 2. wrong_notes 테이블
- `wrong_count` 추가
- `times_wrong` 추가
- `first_wrong_at` 추가
- `last_wrong_at` 수정 (nullable → required)
- `updated_at` 추가

---

## 🚀 **다음 단계**

1. ✅ 수정된 `database.ts` 파일 생성
2. ✅ 타입 일치 확인
3. ✅ API 개발 시작
