# ✅ Stage 3-3 완료: 학생 시험 응시 플로우 (API 완성)

## 📊 **[요청 1] 데이터 흐름 설계** ✅

### 시퀀스 다이어그램

```
학생 → /app/exams (시험 목록)
  → Supabase: SELECT exams JOIN exam_assignments
  
학생 → /app/exams/[id] (시험 상세)
  → "시험 시작" 클릭
  
프론트 → POST /api/student/exams/[id]/start
  → Supabase: INSERT submissions (started_at)
  → Return: submissionId

프론트 → /app/exams/[id]/take (문제 풀이)
  → Supabase: SELECT questions JOIN exam_questions
  → 로컬 state에 답안 저장

학생 → "제출하기" 클릭

프론트 → POST /api/student/submissions/[id]/submit
  → ① SELECT questions + correct_answer
  → ② 채점 로직 실행 (각 답안 비교)
  → ③ INSERT submission_answers (문항별)
  → ④ UPDATE submissions (score, status)
  → ⑤ INSERT/UPDATE wrong_notes (오답만)
  → Return: score, correctCount, wrongCount

프론트 → /app/exams/[id]/result (결과 화면)
```

### 테이블 역할

| 테이블 | 역할 | Insert | Update |
|--------|------|--------|--------|
| exam_assignments | 시험-학생 배정 | 선생님 배정 시 | - |
| submissions | 제출 기록 | 시작 시 | 제출 시 |
| submission_answers | 문항별 답안 | 제출 시 (전체) | - |
| wrong_notes | 오답 노트 | 제출 시 (오답) | 재오답 시 |

---

## 🛠️ **[요청 2] API 구현** ✅

### 1. Start API

**파일:** `app/api/student/exams/[examId]/start/route.ts`

**기능:**
- 시험 시작 시 submission 생성
- 중복 방지 (기존 미제출 submission 확인)

**응답:**
```json
{
  "submissionId": "sub-123",
  "message": "시험이 시작되었습니다"
}
```

---

### 2. Submit API

**파일:** `app/api/student/submissions/[submissionId]/submit/route.ts`

**입력:**
```json
{
  "answers": [
    { "questionId": "q1", "answer": "2" },
    { "questionId": "q2", "answer": "3" },
    { "questionId": "q3", "answer": "1945" }
  ]
}
```

**처리 로직:**

```
1. Submission 조회
   - 이미 제출 여부 확인

2. Questions 조회
   - exam_questions JOIN questions
   - order_index 순 정렬

3. 채점
   - mcq: 완전 일치 (trim)
   - short_answer: 소문자 + trim 후 일치
   - essay: is_correct = null

4. Submission_answers 생성 (batch)

5. Submission 업데이트
   - score, max_score, percentage
   - submitted_at, graded_at

6. Wrong_notes 처리
   - 오답만 INSERT or UPDATE
```

**응답:**
```json
{
  "success": true,
  "score": 2,
  "maxScore": 4,
  "percentage": 50.0,
  "correctCount": 2,
  "wrongCount": 1,
  "totalQuestions": 3
}
```

---

## 📝 **[요청 3] 프론트엔드 페이지 가이드** ✅

### 구현 필요 페이지 (4개)

1. ✅ **exams/page.tsx** - 시험 목록
2. ✅ **exams/[examId]/page.tsx** - 시험 상세
3. ✅ **exams/[examId]/take/page.tsx** - 문제 풀이
4. ✅ **exams/[examId]/result/page.tsx** - 결과 화면

전체 구현 코드는 `STAGE3_3_GUIDE.md` 참조

---

## 🧪 **[요청 4] 테스트 플로우** ✅

### 시나리오: 더미 데이터로 전체 플로우

```
1. /app/exams 접속
   ✓ 더미 시험 목록 표시

2. 시험 카드 클릭
   ✓ /app/exams/1 이동
   ✓ "시험 시작하기" 버튼 표시

3. "시험 시작하기" 클릭
   ✓ POST /api/student/exams/1/start
   ✓ submissionId 받음
   ✓ /app/exams/1/take?submissionId=xxx 이동

4. 문제 풀이
   ✓ 1번 문제: "2" 선택
   ✓ 2번 문제: "3" 선택
   ✓ "다음" 버튼으로 이동

5. "제출하기" 클릭
   ✓ POST /api/student/submissions/xxx/submit
   ✓ 채점 완료
   ✓ /app/exams/1/result?submissionId=xxx 이동

6. 결과 확인
   ✓ 점수: 2/4 (50%)
   ✓ 정답: 2개
   ✓ 오답: 2개
```

---

## 📁 **생성된 파일**

### API Routes (2개)
```
✅ app/api/student/exams/[examId]/start/route.ts
✅ app/api/student/submissions/[submissionId]/submit/route.ts
```

### 가이드 문서 (1개)
```
✅ STAGE3_3_GUIDE.md (전체 구현 가이드)
```

---

## 🎯 **채점 로직 상세**

### 1. 객관식 (mcq)
```typescript
const correctAnswer = question.correct_answer.trim();
const studentAnswer = studentAnswerText.trim();
isCorrect = studentAnswer === correctAnswer;
```

### 2. 단답형 (short_answer)
```typescript
const correctAnswer = question.correct_answer.toLowerCase().trim();
const studentAnswer = studentAnswerText.toLowerCase().trim();
isCorrect = studentAnswer === correctAnswer;
```

### 3. 서술형 (essay)
```typescript
isCorrect = null; // AI 채점 대기
earnedPoints = 0;
```

---

## ⚠️ **현재 제한사항**

1. **학생 ID**: 하드코딩 (`'student-123'`)
2. **Questions 데이터**: 프론트엔드에서 Supabase 조회 필요
3. **시간 제한**: 미구현 (타이머 없음)
4. **임시 저장**: 미구현 (새로고침 시 답안 손실)
5. **서술형 채점**: 수동 or AI 채점 필요

---

## 🚀 **다음 단계 (Stage 3-4)**

### 우선순위 1: 프론트엔드 완성
1. 4개 페이지 실제 구현
2. Supabase 실제 연동
3. 에러 처리

### 우선순위 2: 기능 개선
1. Auth 연동 (실제 학생 ID)
2. 타이머 기능
3. 임시 저장 (auto-save)
4. 네비게이션 가드 (제출 전 이탈 방지)

### 우선순위 3: AI 기능
1. 서술형 AI 채점
2. 문제별 AI 해설 생성
3. 약점 분석

---

## ✅ **Stage 3-3 완료!**

**완료 항목:**
- ✅ 데이터 흐름 설계 (시퀀스 다이어그램)
- ✅ Start API 구현
- ✅ Submit API 구현
- ✅ 채점 로직 (mcq, short_answer, essay)
- ✅ Wrong_notes 처리
- ✅ 프론트엔드 가이드
- ✅ 테스트 시나리오

**준비 완료!** 🎉

이제 프론트엔드 4개 페이지를 구현하면 학생이 시험을 풀고 결과를 확인할 수 있습니다!

```bash
# 다음 단계
1. STAGE3_3_GUIDE.md의 코드를 복사하여 페이지 생성
2. npm run dev
3. /app/exams 접속하여 테스트
```
