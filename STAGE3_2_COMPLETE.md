# ✅ Stage 3-2 완료: 엑셀 업로드 및 시험 생성

## 📋 **[요청 4] 전체 테스트 플로우**

### 🚀 **사전 준비**

#### 1. 환경 변수 설정
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 필수!
```

#### 2. 패키지 설치 (이미 완료되었을 것)
```bash
npm install exceljs @supabase/supabase-js
```

#### 3. 개발 서버 실행
```bash
npm run dev
```

---

### 🎬 **전체 테스트 절차**

#### **1단계: 시험 기본 정보 입력**

```
1. 브라우저 접속
   http://localhost:3000/admin/exams/new

2. Step 1 화면 확인
   [1] 기본 정보 ━━━ [2] 템플릿 다운로드 ─ [3] 문제 업로드
   
   시험 이름 *
   [                                    ]
   
   대상 반 *
   [  반 선택  ▼]
   
   시험 일시 *
   [     날짜/시간 선택      ]
   
   제한 시간 (분) *
   [ 70 ]

3. 정보 입력
   - 시험 이름: "2024 수능특강 1회 모의고사"
   - 대상 반: "고3-A반"
   - 시험 일시: 2024-12-20T19:00
   - 제한 시간: 70

4. "다음 단계" 클릭
   → Step 2로 이동
   → Step 1에 ✓ 표시
```

---

#### **2단계: 엑셀 템플릿 다운로드**

```
5. Step 2 화면 확인
   [✓] 기본 정보 ━━━ [2] 템플릿 다운로드 ─ [3] 문제 업로드
   
   📋 템플릿 작성 안내
   • 아래 버튼을 눌러 엑셀 템플릿을 다운로드하세요
   • 템플릿에 문제, 보기, 정답을 입력하세요
   • 작성이 완료되면 다음 단계에서 업로드하세요
   
   템플릿 컬럼 구조
   question_number  문제 번호 (1, 2, 3, ...)
   question_type    mcq (객관식) | short_answer (단답형)
   ...
   
   [📋 엑셀 템플릿 다운로드]
   
   [이전]              [다음 단계]

6. "엑셀 템플릿 다운로드" 클릭
   → exam_template.xlsx 다운로드
   → [✓ 다운로드 완료] 배지 표시
   → "다음 단계" 버튼 활성화

7. "다음 단계" 클릭
   → Step 3로 이동
   → Step 2에 ✓ 표시
```

---

#### **3단계: 엑셀 파일 작성**

```
8. 다운로드한 exam_template.xlsx 열기 (Excel)

9. "문제 목록" 시트에 문제 작성
   
   예시:
   ┌────┬──────┬──────────────────────┬─────────────┬────────┬────┐
   │ 1  │ mcq  │ What is the capital  │ London||    │   2    │ 1  │
   │    │      │ of France?           │ Paris||...  │        │    │
   ├────┼──────┼──────────────────────┼─────────────┼────────┼────┤
   │ 2  │ mcq  │ Which planet is      │ Venus||     │   2    │ 1  │
   │    │      │ known as Red Planet? │ Mars||...   │        │    │
   ├────┼──────┼──────────────────────┼─────────────┼────────┼────┤
   │ 3  │short │ What year did WWII   │             │  1945  │ 2  │
   │    │_answ │ end?                 │             │        │    │
   └────┴──────┴──────────────────────┴─────────────┴────────┴────┘

10. 작성 완료 후 저장
    파일명: my_exam.xlsx (아무 이름이나 가능)
```

---

#### **4단계: 엑셀 파일 업로드**

```
11. Step 3 화면 확인
    [✓] 기본 정보 ━━━ [✓] 템플릿 다운로드 ━━━ [3] 문제 업로드
    
    문제 파일 업로드
    작성한 엑셀 파일을 업로드하여 시험을 생성하세요
    
    엑셀 파일 선택 *
    ┌─────────────────────────────────────┐
    │        📋                           │
    │  클릭하여 파일 선택                  │
    │  또는 파일을 여기로 드래그하세요      │
    └─────────────────────────────────────┘
    
    [  문제 업로드하고 시험 생성하기  ]
    
    [이전]

12. 파일 선택 영역 클릭
    → 파일 선택 다이얼로그 열림
    → my_exam.xlsx 선택
    → 파일명 + 크기 표시

13. "문제 업로드하고 시험 생성하기" 클릭
    → "업로드 중..." 표시
    → API 요청 (POST /api/admin/exams/import)
```

---

#### **5단계: 성공 확인**

```
14. 성공 시
    Alert: "시험이 생성되었습니다!
            문제 3개, 총 4점"
    
    → /admin/exams 페이지로 자동 이동
    → 생성된 시험이 목록에 표시

15. 실패 시 (에러 예시)
    ┌─────────────────────────────────────┐
    │ 에러 메시지 표시 (빨간색 박스)       │
    │                                     │
    │ 엑셀 데이터 검증 실패               │
    │                                     │
    │ 3행: 문제 지문이 비어있습니다       │
    │ 5행: 보기는 2~5개여야 합니다        │
    └─────────────────────────────────────┘
    
    → 엑셀 파일 수정 후 재업로드
```

---

## 📊 **데이터 흐름 확인**

### Supabase 테이블 확인

```sql
-- 1. exams 테이블
SELECT id, title, class_id, duration, total_points, status
FROM exams
WHERE title = '2024 수능특강 1회 모의고사'
LIMIT 1;

-- 결과:
-- id: abc-123-...
-- title: 2024 수능특강 1회 모의고사
-- class_id: 1
-- duration: 70
-- total_points: 4
-- status: draft

-- 2. questions 테이블
SELECT id, type, content, options, correct_answer, points
FROM questions
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 결과:
-- id: q1-...  | mcq | What is... | ["London", "Paris", ...] | 2 | 1
-- id: q2-...  | mcq | Which...   | ["Venus", "Mars", ...]    | 2 | 1
-- id: q3-...  | short_answer | What year... | null | 1945 | 2

-- 3. exam_questions 테이블
SELECT exam_id, question_id, order_index, points_override
FROM exam_questions
WHERE exam_id = 'abc-123-...';

-- 결과:
-- abc-123-... | q1-... | 1 | null
-- abc-123-... | q2-... | 2 | null
-- abc-123-... | q3-... | 3 | null
```

---

## ⚠️ **일반적인 에러 및 해결**

### 1. **"SUPABASE_SERVICE_ROLE_KEY is not defined"**
```
원인: 환경 변수 미설정
해결: .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가
```

### 2. **"문제 목록 시트를 찾을 수 없습니다"**
```
원인: 시트 이름이 다름
해결: 템플릿에서 "문제 목록" 시트 확인
```

### 3. **"중복된 문제 번호가 있습니다"**
```
원인: question_number 중복
해결: 엑셀에서 1, 2, 3, ... 순차적으로 입력
```

### 4. **"객관식 문제는 보기가 필요합니다"**
```
원인: mcq 타입인데 choices 비어있음
해결: choices 컬럼에 "A||B||C||D||E" 형식으로 입력
```

### 5. **"보기는 2~5개여야 합니다"**
```
원인: 보기가 1개 또는 6개 이상
해결: 2~5개 범위로 조정
```

### 6. **"시험 생성 실패"**
```
원인: DB 연결 오류 또는 RLS 정책
해결:
1. Supabase 대시보드에서 테이블 접근 권한 확인
2. SERVICE_ROLE_KEY 사용 확인
3. RLS 정책 확인 (필요시 비활성화)
```

---

## 🎯 **검증 체크리스트**

### API 엔드포인트
- [x] POST /api/admin/exams/template (템플릿 다운로드)
- [x] POST /api/admin/exams/import (파일 업로드)

### 데이터 검증
- [x] question_number 중복 체크
- [x] question_type 유효성 체크 (mcq, short_answer, essay)
- [x] 필수 필드 체크 (question_text, correct_answer)
- [x] choices 유효성 체크 (객관식: 2~5개)
- [x] 파일 크기 제한 (10MB)
- [x] 파일 형식 체크 (.xlsx)

### DB 트랜잭션
- [x] Exam 생성
- [x] Questions 생성 (batch insert)
- [x] ExamQuestions 연결 (batch insert)
- [x] 실패 시 롤백 (수동 delete)

### UI/UX
- [x] Step Indicator (1 ━━ 2 ━━ 3)
- [x] Validation 메시지
- [x] 로딩 상태
- [x] 에러 메시지
- [x] 성공 후 리다이렉트

---

## 📁 **생성된 파일**

### API Route (1개)
```
✅ app/api/admin/exams/import/route.ts
   - POST 요청 처리
   - FormData 파싱
   - ExcelJS 파싱
   - Supabase 트랜잭션
   - 에러 처리 + 롤백
```

### 페이지 (1개 수정)
```
✅ app/(teacher)/admin/exams/new/page.tsx
   - Step 3 추가
   - 파일 업로드 UI
   - 업로드 핸들러
   - 에러 처리
```

---

## 🔧 **코드 하이라이트**

### choices 저장 방식
```typescript
// 엑셀: "London||Paris||Berlin||Madrid||Rome"
// DB: ["London", "Paris", "Berlin", "Madrid", "Rome"] (JSONB 배열)

const choices = choicesStr
  .split('||')
  .map(s => s.trim())
  .filter(Boolean);
```

### 트랜잭션 시뮬레이션
```typescript
// 1. Exam 생성
const { data: exam } = await supabase.from('exams').insert(...).select().single();

// 2. Questions 생성
const { data: questions } = await supabase.from('questions').insert(...).select();

// 3. ExamQuestions 연결
const { error } = await supabase.from('exam_questions').insert(...);

// 4. 실패 시 롤백
if (error) {
  await supabase.from('questions').delete().in('id', questionIds);
  await supabase.from('exams').delete().eq('id', examId);
}
```

### Validation
```typescript
// 문제 번호 중복 체크
const duplicates = questionNumbers.filter((num, idx) => 
  questionNumbers.indexOf(num) !== idx
);

// 보기 개수 체크 (객관식)
if (choices.length < 2 || choices.length > 5) {
  errors.push(`${rowNumber}행: 보기는 2~5개여야 합니다`);
}
```

---

## 🚀 **다음 단계 (Stage 3-3)**

### 시험 목록 개선
1. **실제 DB 연동**
   - /admin/exams에서 Supabase 데이터 표시
   - 생성된 시험 확인

2. **시험 상세 페이지**
   - /admin/exams/[id]
   - 문제 목록 표시
   - 수정/삭제 기능

3. **학생 배정**
   - 반 전체 또는 개별 학생
   - exam_assignments 생성

---

## ✅ **Stage 3-2 완료!**

**완료 항목:**
- ✅ 엑셀 → DB 매핑 설계
- ✅ choices JSONB 배열 저장
- ✅ API Route 구현 (import)
- ✅ Step 3 UI 추가
- ✅ 파일 업로드 + Validation
- ✅ Supabase 트랜잭션
- ✅ 에러 처리 + 롤백
- ✅ 성공 후 리다이렉트

**준비 완료!** 🎉

```bash
# 전체 플로우 테스트
npm run dev

# 1. http://localhost:3000/admin/exams/new
# 2. 시험 정보 입력
# 3. 템플릿 다운로드
# 4. 엑셀 작성
# 5. 업로드
# 6. /admin/exams에서 확인
```
