# ✅ Stage 3-4 완료: 오답노트 및 복습 시스템

## 📋 **[요청 1] wrong_notes 업데이트 구체화** ✅

### Wrong_notes 처리 로직 (Pseudocode)

```pseudocode
// Submit API 내부 (Step 6)

wrongQuestions = []  // 오답 문제 수집

// 1. 오답 수집
for each question in examQuestions:
  if is_correct == false:
    wrongQuestions.push({
      questionId,
      studentAnswer,
      correctAnswer
    })

// 2. Wrong_notes 업데이트
for each wrong in wrongQuestions:
  
  // 2-1. 기존 레코드 확인
  existingNote = SELECT * FROM wrong_notes
                 WHERE student_id = submission.student_id
                   AND question_id = wrong.questionId
                 LIMIT 1
  
  if existingNote EXISTS:
    // 2-2A. 업데이트
    UPDATE wrong_notes
    SET times_wrong = times_wrong + 1,
        wrong_count = wrong_count + 1,  // 호환성
        last_wrong_at = NOW(),
        updated_at = NOW(),
        student_answer = wrong.studentAnswer,  // 최신 오답
        correct_answer = wrong.correctAnswer
    WHERE id = existingNote.id
    
  else:
    // 2-2B. 새로 생성
    INSERT INTO wrong_notes (
      student_id,
      question_id,
      submission_type,    // 'exam' or 'homework'
      submission_id,
      student_answer,
      correct_answer,
      wrong_count,        // 1
      times_wrong,        // 1
      first_wrong_at,     // NOW()
      last_wrong_at,      // NOW()
      review_count,       // 0
      last_reviewed_at,   // null
      next_review_at,     // null
      mastered,           // false
      mastered_at,        // null
      created_at,         // NOW()
      updated_at          // NOW()
    )
    
  // 2-3. 에러 처리
  try/catch:
    에러는 로그만 남기고 메인 플로우 중단하지 않음
    (wrong_notes 실패가 제출 전체를 막으면 안 됨)
```

### 개선 사항

**기존 대비 변경점:**

1. ✅ **student_answer 갱신**: 최신 오답으로 업데이트
2. ✅ **wrong_count 추가**: 호환성 유지 (times_wrong과 동기화)
3. ✅ **submission_type**: 'exam' or 'homework' 구분
4. ✅ **에러 처리 강화**: 개별 try-catch, 메인 플로우 보호
5. ✅ **응답에 통계 추가**: wrongNotesProcessed, wrongNotesErrors

---

## 🛠️ **[요청 2] API / 쿼리 설계** ✅

### Today Review API

**경로:** `GET /api/student/review/today`

**Query Params:**
```
?studentId=student-123
```

---

### 쿼리 전략

**목표:** 학생에게 오늘 복습할 오답 10문제 추천

**선택 기준:**

```
우선순위 공식 (구현 단순화):
1. mastered = false만 포함
2. times_wrong 많은 순 (DESC)
3. last_wrong_at 최근 순 (DESC)
4. LIMIT 10

이유:
- times_wrong: 자주 틀리는 문제 = 약점
- last_wrong_at: 최근에 틀린 문제 = 기억이 생생
- mastered = false: 아직 정복 안 한 문제만
```

**실제 Supabase 쿼리:**

```typescript
const { data: wrongNotes } = await supabase
  .from('wrong_notes')
  .select(`*, question:questions(*)`)
  .eq('student_id', studentId)
  .eq('mastered', false)
  .order('times_wrong', { ascending: false })  // 많이 틀린 순
  .order('last_wrong_at', { ascending: false }) // 최근 순
  .limit(10);
```

---

### API 응답 형식

```json
{
  "questions": [
    {
      "wrongNoteId": "wn-123",
      "questionId": "q-456",
      "type": "mcq",
      "content": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid", "Rome"],
      "correctAnswer": "2",
      "explanation": "Paris is the capital and most populous city of France.",
      "points": 1,
      "category": "Geography",
      "difficulty": "easy",
      "timesWrong": 3,
      "lastWrongAt": "2024-12-07T15:30:00Z",
      "studentAnswer": "1"
    },
    // ... 최대 10개
  ],
  "count": 10
}
```

---

### 향후 개선 아이디어

**간격 반복 알고리즘 (Spaced Repetition):**

```python
# 예: SM-2 알고리즘 변형
next_review_interval = {
  1st review: 1 day,
  2nd review: 3 days,
  3rd review: 7 days,
  4th review: 14 days,
  ...
}

priority_score = (
  times_wrong * 5 +
  days_since_last_review * 2 +
  (is_due_for_review ? 10 : 0)
)
```

**현재는 단순 버전:**
- times_wrong 높은 순
- 최근에 틀린 순
- 10개 제한

---

## 📝 **[요청 3] 복습 화면 UI** ✅

### Review Page 구조

**경로:** `app/(student)/app/review/page.tsx`

**기능:**
1. ✅ Today review API 호출
2. ✅ 문제 카드 리스트 표시
3. ✅ "정답 보기" 토글
4. ✅ 로딩/에러 처리
5. ✅ 빈 상태 처리

---

### UI 컴포넌트

#### 1. 헤더
```tsx
<SectionTitle title="오늘의 복습" subtitle="틀렸던 문제를 다시 풀어보세요" />
<Badge variant="info">{questions.length}문제</Badge>
```

#### 2. 안내 카드
```tsx
<AppCard className="bg-indigo-50">
  💡 복습 팁
  - 틀렸던 문제를 다시 풀어보고, 정답을 확인하세요.
  - 이해가 안 되는 부분은 선생님께 질문하세요!
</AppCard>
```

#### 3. 문제 카드 (각 문제마다)
```tsx
<AppCard>
  {/* 헤더 */}
  <div>
    <span>1번</span>
    <Badge>객관식</Badge>
    <Badge>보통</Badge>
    <div>3번 틀림 | 1점</div>
  </div>

  {/* 카테고리 */}
  <div>분야: Geography</div>

  {/* 문제 지문 */}
  <div>{question.content}</div>

  {/* 보기 (객관식) */}
  {type === 'mcq' && (
    <div>
      {options.map((option, idx) => (
        <div className={
          showAnswer && idx+1 === correctAnswer ? 'emerald' :
          showAnswer && idx+1 === studentAnswer ? 'rose' :
          'slate'
        }>
          {idx+1}. {option}
          {showAnswer && idx+1 === correctAnswer && '✓ 정답'}
          {showAnswer && idx+1 === studentAnswer && idx+1 !== correctAnswer && '✗ 내 답'}
        </div>
      ))}
    </div>
  )}

  {/* 정답 보기 버튼 */}
  <Button onClick={toggleAnswer}>
    {showAnswer ? '정답 숨기기' : '정답 보기'}
  </Button>

  {/* 정답 및 해설 (토글) */}
  {showAnswer && (
    <div>
      <div className="emerald">정답: 2번</div>
      <div className="rose">내가 선택한 답: 1번</div>
      <div className="slate">해설: Paris is the capital...</div>
    </div>
  )}
</AppCard>
```

#### 4. 하단 액션
```tsx
<Button onClick={loadTodayReview}>새로고침</Button>
```

---

### State 관리

```typescript
const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
```

---

### 로딩/에러 처리

**로딩 중:**
```tsx
<LoadingSpinner size="lg" />
```

**에러 발생:**
```tsx
<AppCard>
  <p className="text-rose-600">{error}</p>
  <Button onClick={retry}>다시 시도</Button>
</AppCard>
```

**빈 상태:**
```tsx
<EmptyState
  message="복습할 문제가 없습니다"
  description="모든 문제를 마스터했거나, 아직 틀린 문제가 없습니다"
/>
```

---

## 🧪 **[요청 4] 동작 확인 시나리오** ✅

### 전체 테스트 플로우

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 시험 치르기 (일부러 틀리기)                         │
└─────────────────────────────────────────────────────────────┘

1. http://localhost:3000/app/exams 접속

2. "2024 수능특강 1회" 클릭
   → /app/exams/1

3. "시험 시작하기" 클릭
   → POST /api/student/exams/1/start
   → submission 생성 (sub-abc-123)
   → /app/exams/1/take?submissionId=sub-abc-123

4. 문제 풀이 (일부러 틀리기)
   ✓ 1번: "2" 선택 (정답)
   ✗ 2번: "3" 선택 (오답, 정답은 "2")
   ✗ 3번: "2000" 입력 (오답, 정답은 "1945")

5. "제출하기" 클릭
   → POST /api/student/submissions/sub-abc-123/submit
   → 채점 완료
   → wrong_notes 업데이트 (2개 문제)

┌─────────────────────────────────────────────────────────────┐
│ Step 2: wrong_notes 확인 (Supabase)                         │
└─────────────────────────────────────────────────────────────┘

6. Supabase 대시보드 접속
   → wrong_notes 테이블 열기

7. 쿼리 실행:
   ```sql
   SELECT * FROM wrong_notes
   WHERE student_id = 'student-123'
   ORDER BY created_at DESC;
   ```

8. 확인 사항:
   ✓ 2개 레코드 생성 (q2, q3)
   ✓ question_id: q2, q3
   ✓ times_wrong: 1 (각각)
   ✓ wrong_count: 1 (각각)
   ✓ student_answer: "3", "2000"
   ✓ correct_answer: "2", "1945"
   ✓ mastered: false (둘 다)
   ✓ first_wrong_at, last_wrong_at: 같은 시간
   ✓ submission_id: sub-abc-123

┌─────────────────────────────────────────────────────────────┐
│ Step 3: 복습 화면 확인                                      │
└─────────────────────────────────────────────────────────────┘

9. http://localhost:3000/app/review 접속

10. 화면 확인:
    ✓ "오늘의 복습" 제목
    ✓ "2문제" 배지
    ✓ 💡 복습 팁 카드

11. 문제 카드 확인:
    ✓ 1번 문제: "Which planet..."
      - 객관식 배지
      - "1번 틀림" 표시
      - 보기 5개 표시

    ✓ 2번 문제: "What year..."
      - 단답형 배지
      - "1번 틀림" 표시

12. "정답 보기" 클릭 (1번 문제)
    ✓ 정답: "2번" (초록 박스)
    ✓ 내가 선택한 답: "3번" (빨강 박스)
    ✓ 해설: "Mars is known as..." (회색 박스)
    ✓ 보기에 ✓/✗ 표시

13. "정답 숨기기" 클릭
    ✓ 정답/해설 숨김

┌─────────────────────────────────────────────────────────────┐
│ Step 4: 재시험 (같은 문제 또 틀리기)                        │
└─────────────────────────────────────────────────────────────┘

14. /app/exams → 같은 시험 다시 치르기

15. 2번 문제 또 틀리기 (다른 답 선택)
    ✗ 2번: "1" 선택 (또 오답, 정답은 "2")

16. 제출 후 wrong_notes 확인:
    ```sql
    SELECT * FROM wrong_notes
    WHERE student_id = 'student-123'
      AND question_id = 'q2';
    ```

17. 업데이트 확인:
    ✓ times_wrong: 2 (1 → 2)
    ✓ wrong_count: 2
    ✓ student_answer: "1" (최신 오답으로 갱신)
    ✓ last_wrong_at: 새로운 시간
    ✓ first_wrong_at: 그대로 (첫 오답 시간 유지)

┌─────────────────────────────────────────────────────────────┐
│ Step 5: 복습 화면에서 우선순위 확인                         │
└─────────────────────────────────────────────────────────────┘

18. /app/review 새로고침

19. 문제 순서 확인:
    ✓ 1번 위치: q2 (times_wrong = 2) ← 더 많이 틀린 문제
    ✓ 2번 위치: q3 (times_wrong = 1)

20. API 응답 확인 (개발자 도구):
    ```json
    {
      "questions": [
        {
          "questionId": "q2",
          "timesWrong": 2,  ← 높은 우선순위
          "lastWrongAt": "2024-12-07T16:00:00Z"
        },
        {
          "questionId": "q3",
          "timesWrong": 1,
          "lastWrongAt": "2024-12-07T15:30:00Z"
        }
      ],
      "count": 2
    }
    ```
```

---

### 추가 테스트 케이스

#### 테스트 1: 10개 이상 틀린 경우
```
1. 45문제 시험에서 20문제 틀리기
2. wrong_notes에 20개 레코드 생성
3. /app/review 접속
4. 확인: 최대 10개만 표시
```

#### 테스트 2: mastered = true 처리
```sql
-- 1. 특정 문제를 마스터로 표시
UPDATE wrong_notes
SET mastered = true, mastered_at = NOW()
WHERE id = 'wn-123';

-- 2. /app/review 새로고침
-- 3. 확인: 마스터된 문제는 표시 안 됨
```

#### 테스트 3: 빈 상태
```
1. 시험을 모두 100점으로 제출 (오답 없음)
2. wrong_notes 테이블 비어있음
3. /app/review 접속
4. 확인: EmptyState 표시
   "복습할 문제가 없습니다"
```

---

## 📁 **생성된 파일**

### API Routes (2개)
```
✅ app/api/student/review/today/route.ts              (새로 생성)
✅ app/api/student/submissions/[submissionId]/submit/route.ts  (개선)
```

### 프론트엔드 페이지 (1개)
```
✅ app/(student)/app/review/page.tsx                  (새로 생성)
```

### 백업 (1개)
```
📦 app/api/student/submissions/[submissionId]/submit/route-old.ts  (백업)
```

---

## 🎯 **핵심 기능 요약**

### 1. Wrong_notes 업데이트 (Submit API)

**트리거:** 시험/숙제 제출 시

**로직:**
```typescript
for each wrong answer:
  if exists:
    UPDATE times_wrong++, last_wrong_at, student_answer
  else:
    INSERT new record
```

**필드:**
- ✅ `times_wrong`: 틀린 횟수
- ✅ `student_answer`: 최신 오답
- ✅ `last_wrong_at`: 마지막 오답 시간
- ✅ `mastered`: 마스터 여부 (기본 false)

---

### 2. Today Review API

**엔드포인트:** `GET /api/student/review/today?studentId=xxx`

**쿼리:**
```sql
SELECT wn.*, q.*
FROM wrong_notes wn
JOIN questions q ON wn.question_id = q.id
WHERE wn.student_id = $1
  AND wn.mastered = false
ORDER BY 
  wn.times_wrong DESC,     -- 많이 틀린 순
  wn.last_wrong_at DESC    -- 최근 순
LIMIT 10
```

**응답:**
- questions: 배열 (최대 10개)
- count: 문제 개수

---

### 3. Review Page UI

**기능:**
- ✅ 문제 리스트 카드
- ✅ "정답 보기" 토글
- ✅ 정답/오답 색상 구분
- ✅ 해설 표시
- ✅ 틀린 횟수 배지

**상태:**
- Loading: 스피너
- Error: 재시도 버튼
- Empty: "복습할 문제가 없습니다"

---

## ⚠️ **현재 제한사항**

1. **복습 완료 처리 없음**
   - "정답 보기"만 가능
   - 실제 풀기 + 채점 미구현
   - `review_count` 업데이트 안 됨

2. **mastered 자동 판정 없음**
   - 수동으로 UPDATE 필요
   - 추후: 3회 연속 정답 → mastered = true

3. **간격 반복 알고리즘 미구현**
   - `next_review_at` 사용 안 함
   - 단순 우선순위만 적용

4. **학생 ID 하드코딩**
   - 'student-123' 고정
   - Auth 연동 필요

---

## 🚀 **다음 단계 (Stage 3-5)**

### 우선순위 1: 복습 완료 처리
1. 복습 문제 풀이 모드
2. 정답 체크 + 점수화
3. `review_count` 업데이트
4. 마스터 자동 판정 (3회 연속 정답)

### 우선순위 2: 간격 반복 알고리즘
1. `next_review_at` 계산
2. SM-2 또는 변형 알고리즘
3. "오늘 복습 필요" 필터

### 우선순위 3: AI 기능
1. 문항별 AI 해설 생성
2. 약점 분석 (카테고리/난이도별)
3. 추천 문제 생성

---

## ✅ **Stage 3-4 완료!**

**완료 항목:**
- ✅ wrong_notes 업데이트 로직 (Submit API 개선)
- ✅ Today review API (우선순위 쿼리)
- ✅ Review page UI (정답 토글)
- ✅ 테스트 시나리오 (4단계)
- ✅ 문서화

**준비 완료!** 🎉

이제 학생이:
1. 시험 치르기
2. 틀린 문제 자동 수집
3. 복습 화면에서 오답 10문제 보기
4. 정답/해설 확인

까지 경험할 수 있습니다!

```bash
# 테스트 시작
npm run dev

# 플로우
1. /app/exams → 시험 치르기 (일부러 틀리기)
2. Supabase → wrong_notes 확인
3. /app/review → 오답 10문제 확인
4. "정답 보기" → 정답/해설 확인
```
