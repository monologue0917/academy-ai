# 📊 Academy AI 데이터베이스 스키마 v2.0 - 최종 검토 완료

## ✅ **요구사항 충족 여부**

### 1. submissions 테이블 ✅
```sql
✅ submission_type enum ('exam', 'homework')
✅ exam_id, homework_id (polymorphic, CHECK 제약조건)
✅ status (assignment_status) ← 추가됨!
   - pending → in_progress → submitted → graded
```

**변경사항:**
- ✨ **status 컬럼 추가**: `assignment_status NOT NULL DEFAULT 'pending'`
- ✨ **인덱스 추가**: `CREATE INDEX idx_submissions_status ON submissions(status)`

### 2. exam_questions / homework_questions ✅
```sql
✅ order_index (= question_number 역할)
✅ points_override (= score 역할, null이면 questions.points 사용)
```

**기존 구조 그대로 유지** (이미 요구사항 만족)

### 3. questions ✅
```sql
✅ question_type enum ('mcq', 'short_answer', 'essay')
✅ difficulty_level enum ('easy', 'medium', 'hard')
✅ tags (TEXT[] + GIN 인덱스)
```

**기존 구조 그대로 유지** (이미 요구사항 만족)

### 4. wrong_notes ✅
```sql
✅ student_id, question_id
✅ times_wrong (SMALLINT DEFAULT 1) ← 추가됨!
✅ last_wrong_at (TIMESTAMPTZ DEFAULT NOW()) ← 추가됨!
✅ mastered (BOOLEAN DEFAULT false)
```

**변경사항:**
- ✨ **times_wrong 컬럼 추가**: 틀린 횟수 누적
- ✨ **last_wrong_at 컬럼 추가**: 마지막으로 틀린 시간
- ✨ **인덱스 추가**: `idx_wrong_notes_last_wrong_at`, `idx_wrong_notes_times_wrong`
- ✨ **트리거 추가**: `upsert_wrong_note()` - 틀린 문제 자동 등록/업데이트

---

## 📋 **전체 테이블 구조 (13개)**

### 1. **Core Tables (기본 엔티티)**

#### 1.1 academies (학원)
```sql
역할: 멀티테넌트 최상위 엔티티
주요: id, name, code (입장 코드), settings (JSON)
```

#### 1.2 users (사용자)
```sql
역할: 선생님/학생 계정 관리
주요: id, academy_id, email, name, role (teacher/student)
특징: 선생님은 email 필수, 학생은 이름만으로도 가능
```

#### 1.3 classes (반)
```sql
역할: 수업 반 관리 (예: 고3-A반)
주요: id, academy_id, teacher_id, name, schedule (JSON)
특징: 주간 시간표 JSON 저장 [{ day, startTime, endTime }]
```

#### 1.4 class_enrollments (반 등록)
```sql
역할: 학생-반 다대다 관계
주요: id, class_id, student_id
특징: 한 학생이 여러 반에 동시 소속 가능
```

---

### 2. **Question Bank (문제 은행)**

#### 2.1 questions (문제)
```sql
역할: 모든 문제를 저장하는 중앙 은행 (재사용 가능)
주요 컬럼:
  - type: mcq, short_answer, essay
  - content: 문제 본문
  - passage: 지문 (독해 문제용)
  - options: 객관식 선지 배열 (JSONB)
  - correct_answer: 정답
  - explanation: 해설
  - points: 기본 배점
  - category: 문제 분류 (빈칸추론, 순서배열, 문법 등)
  - difficulty: easy, medium, hard
  - tags: 태그 배열 (TEXT[], GIN 인덱스)
  - attempt_count, correct_count: 통계 (트리거 자동 업데이트)

용도:
  - 시험/숙제에서 재사용
  - AI 기반 복습 세트 구성 (tags 활용)
  - 약점 분석 (category, tags 활용)
```

---

### 3. **Exams (시험/모의고사)**

#### 3.1 exams (시험)
```sql
역할: 모의고사 정보 저장
주요 컬럼:
  - title: 시험 제목
  - duration: 제한 시간 (분)
  - total_points: 총점 (트리거 자동 계산)
  - scheduled_at: 시작 예정일
  - due_at: 마감일
  - shuffle_questions: 문제 순서 랜덤 여부
  - show_answer_after: 제출 후 정답 공개 여부
  - status: draft, published, closed
```

#### 3.2 exam_questions (시험-문제 매핑)
```sql
역할: 시험에 포함된 문제 목록 및 순서 관리
주요 컬럼:
  - order_index: 문제 순서 (1, 2, 3...) ← question_number 역할
  - points_override: 배점 오버라이드 ← score 역할
                     (null이면 questions.points 사용)

특징:
  - UNIQUE(exam_id, question_id): 같은 문제 중복 방지
  - UNIQUE(exam_id, order_index): 문제 순서 중복 방지
```

---

### 4. **Homeworks (숙제)**

#### 4.1 homeworks (숙제)
```sql
역할: 숙제 정보 저장
주요 컬럼:
  - title: 숙제 제목
  - instructions: 수행 지침
  - total_points: 총점 (트리거 자동 계산)
  - due_at: 마감일
  - allow_late: 늦은 제출 허용 여부
  - late_penalty: 늦은 제출 감점 (%)
```

#### 4.2 homework_questions (숙제-문제 매핑)
```sql
역할: 숙제에 포함된 문제 목록
구조: exam_questions와 동일
```

---

### 5. **Assignments (할당)**

#### 5.1 exam_assignments (시험 할당)
```sql
역할: 학생별 시험 할당 및 진행 상태 추적
주요 컬럼:
  - status: pending → in_progress → submitted → graded
  - started_at: 시작 시간
  - submitted_at: 제출 시간

특징:
  - UNIQUE(exam_id, student_id): 학생당 1개 할당
```

#### 5.2 homework_assignments (숙제 할당)
```sql
역할: 학생별 숙제 할당
구조: exam_assignments와 동일
```

---

### 6. **Submissions (제출)**

#### 6.1 submissions (제출 기록) ★ 업데이트
```sql
역할: 시험/숙제 제출 기록 (Polymorphic 관계)
주요 컬럼:
  - type: exam / homework (submission_type enum)
  - exam_id / homework_id: 둘 중 하나만 존재 (CHECK 제약조건)
  - student_id: 제출한 학생
  - status: pending → in_progress → submitted → graded ← ★ 추가
  - started_at: 시작 시간
  - submitted_at: 제출 시간
  - time_spent: 소요 시간 (초)
  - score, max_score, percentage: 채점 결과
  - graded_by: 채점한 선생님
  - feedback: 전체 피드백
  - is_late: 늦은 제출 여부
  - attempt_number: 재응시 번호

특징:
  - Polymorphic: 시험/숙제 공통 테이블
  - CHECK 제약조건: exam_id 또는 homework_id 중 하나만 NOT NULL
```

#### 6.2 submission_answers (개별 문제 답안)
```sql
역할: 제출된 답안의 문제별 세부 정보
주요 컬럼:
  - answer: 학생 답안
  - is_correct: 정답 여부
  - earned_points: 획득 점수
  - max_points: 배점
  - ai_feedback: AI 피드백
  - teacher_feedback: 선생님 피드백

특징:
  - UNIQUE(submission_id, question_id): 문제당 1개 답안
  - 트리거로 questions.attempt_count, correct_count 자동 업데이트
```

---

### 7. **Wrong Notes (오답 노트)** ★ 업데이트

#### 7.1 wrong_notes (오답 노트)
```sql
역할: 학생별 틀린 문제 추적 및 복습 관리
주요 컬럼:
  - student_id, question_id: 학생-문제 매핑
  - submission_type, submission_id: 출처 정보
  - student_answer, correct_answer: 답안 비교
  - times_wrong: 틀린 횟수 ← ★ 추가
  - last_wrong_at: 마지막으로 틀린 시간 ← ★ 추가
  - review_count: 복습 횟수
  - last_reviewed_at: 마지막 복습일
  - next_review_at: 다음 복습 예정일 (간격 반복)
  - mastered: 완전히 이해했는지 여부

용도:
  - "오늘의 오답 10문제" 선정
    → last_wrong_at 기준 최신 10개, mastered = false
  - "약한 영역 TOP3" 분석
    → questions.tags JOIN, times_wrong 많은 순
  - 간격 반복 학습 (Spaced Repetition)
    → next_review_at 기준 복습 예정 문제 조회

특징:
  - UNIQUE(student_id, question_id): 문제당 1개 기록
  - 트리거 자동 생성/업데이트 (upsert_wrong_note)
```

---

## 🔧 **Triggers (트리거) - 8개**

### 1. updated_at 자동 갱신 (6개)
```sql
academies, users, classes, questions, exams, homeworks
→ UPDATE 시 updated_at 자동 갱신
```

### 2. exam/homework 총점 자동 계산 (2개)
```sql
exam_questions INSERT/UPDATE/DELETE
→ exams.total_points 자동 계산

homework_questions INSERT/UPDATE/DELETE
→ homeworks.total_points 자동 계산
```

### 3. 문제 통계 자동 업데이트 (1개)
```sql
submission_answers INSERT
→ questions.attempt_count, correct_count 자동 증가
```

### 4. 오답 노트 자동 생성/업데이트 (1개) ★ 추가
```sql
submission_answers INSERT (is_correct = false)
→ wrong_notes에 자동 UPSERT
   - 첫 오답: times_wrong = 1, last_wrong_at = NOW()
   - 재오답: times_wrong += 1, last_wrong_at = NOW()
```

---

## 📊 **Indexes (인덱스) - 50+개**

### 주요 인덱스
```sql
-- 멀티테넌트 격리
academy_id (모든 테이블)

-- 관계 조회
FK 컬럼들 (user_id, class_id, exam_id 등)

-- 상태 필터
status 컬럼들 (exams, assignments, submissions)

-- 날짜 범위 검색
scheduled_at, due_at, submitted_at

-- 배열 검색 (GIN)
questions.tags

-- 복습 관리
wrong_notes.next_review_at (WHERE mastered = false)
wrong_notes.last_wrong_at
wrong_notes.times_wrong DESC
```

---

## 🎯 **주요 쿼리 예시**

### 1. 오늘의 오답 10문제
```sql
SELECT q.*
FROM wrong_notes wn
JOIN questions q ON q.id = wn.question_id
WHERE wn.student_id = :student_id
  AND wn.mastered = false
ORDER BY wn.last_wrong_at DESC
LIMIT 10;
```

### 2. 약한 영역 TOP3
```sql
SELECT 
  UNNEST(q.tags) AS tag,
  SUM(wn.times_wrong) AS total_wrong_count,
  COUNT(DISTINCT wn.question_id) AS question_count
FROM wrong_notes wn
JOIN questions q ON q.id = wn.question_id
WHERE wn.student_id = :student_id
  AND wn.mastered = false
GROUP BY tag
ORDER BY total_wrong_count DESC
LIMIT 3;
```

### 3. 다음 복습 예정 문제
```sql
SELECT q.*, wn.next_review_at
FROM wrong_notes wn
JOIN questions q ON q.id = wn.question_id
WHERE wn.student_id = :student_id
  AND wn.mastered = false
  AND wn.next_review_at <= NOW()
ORDER BY wn.next_review_at ASC;
```

### 4. 학생별 평균 점수
```sql
SELECT 
  u.name,
  AVG(s.percentage) AS avg_percentage,
  COUNT(*) AS total_submissions
FROM submissions s
JOIN users u ON u.id = s.student_id
WHERE s.status = 'graded'
  AND s.type = 'exam'
GROUP BY u.id, u.name
ORDER BY avg_percentage DESC;
```

### 5. 문제별 정답률
```sql
SELECT 
  q.id,
  q.content,
  q.category,
  q.difficulty,
  ROUND(100.0 * q.correct_count / NULLIF(q.attempt_count, 0), 2) AS correct_rate
FROM questions q
WHERE q.attempt_count > 0
ORDER BY correct_rate ASC;
```

---

## 🔐 **보안 (RLS - Row Level Security)**

현재는 비활성화 상태. Supabase Auth 연동 시 아래 정책 추가 필요:

```sql
-- 예시: 학생은 자신의 제출 기록만 조회
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid()::uuid = student_id);

-- 예시: 선생님은 자기 학원 데이터만 조회
CREATE POLICY "Teachers view academy data"
  ON exams FOR SELECT
  USING (
    academy_id IN (
      SELECT academy_id FROM users WHERE id = auth.uid()::uuid
    )
  );
```

---

## 📝 **변경 이력**

### v2.0 (2024-12-08)
✅ **submissions.status 컬럼 추가**
   - assignment_status enum 사용
   - 인덱스 추가

✅ **wrong_notes.times_wrong 컬럼 추가**
   - 틀린 횟수 누적
   - 인덱스 추가

✅ **wrong_notes.last_wrong_at 컬럼 추가**
   - 마지막으로 틀린 시간 기록
   - 인덱스 추가

✅ **upsert_wrong_note() 트리거 추가**
   - 틀린 문제 자동 등록/업데이트
   - submission_answers INSERT 시 실행

✅ **주석 및 설명 대폭 강화**
   - 각 테이블/컬럼의 역할 명시
   - 용도 및 활용 예시 추가

---

## 🚀 **다음 단계**

### 1. 샘플 데이터 추가
```bash
supabase/migrations/20241208_v2_seed.sql
```

### 2. TypeScript 타입 생성
```bash
npm run supabase:gen-types
```

### 3. API 연동 테스트
- 시험 생성 → 문제 import → 학생 응시 → 자동 채점
- 오답 노트 자동 생성 확인

### 4. RLS 정책 설정
- Supabase Auth 연동
- 학생/선생님별 접근 권한 설정

---

## 📊 **스키마 통계**

```
ENUM 타입:    6개
테이블:      13개
트리거:       8개
인덱스:      50+개
COMMENT:     80+개
```

**총 SQL 라인 수: 약 1,000줄**

---

✅ **모든 요구사항 충족 완료!**
