# 🎯 Stage 3-1: 모의고사 생성 플로우 - 완료

## ✅ 생성된 파일 목록

### 📁 API 라우트 (4개)
```
src/app/api/admin/exams/
├── route.ts                              ✅ POST: 시험 생성, GET: 시험 목록
├── template/route.ts                     ✅ GET: 엑셀 템플릿 다운로드
└── [examId]/
    ├── import/route.ts                   ✅ POST: 엑셀 업로드 및 문제 import
    └── questions/route.ts                ✅ GET: 시험 문제 목록 조회
```

### 🎨 UI 페이지 (1개)
```
src/app/(teacher)/admin/exams/
└── new/page.tsx                          ✅ Wizard 형식 시험 생성 페이지
```

### 🔧 유틸리티 & 타입 (3개)
```
src/lib/
├── supabase/client.ts                    ✅ Supabase 클라이언트
└── excel.ts                              ✅ 엑셀 파싱/생성 유틸

src/types/
└── exam.ts                               ✅ 타입 정의
```

### 📝 설정 (1개)
```
.env.local.example                        ✅ 환경 변수 템플릿
```

---

## 🚀 설치 및 설정

### 1. 패키지 설치
```bash
npm install @supabase/supabase-js xlsx
npm install -D @types/xlsx
```

### 2. 환경 변수 설정
```bash
# .env.local.example을 .env.local로 복사
cp .env.local.example .env.local

# Supabase 프로젝트 정보 입력
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase 프로젝트 설정
1. https://supabase.com 로그인
2. New Project 생성
3. Settings → API → URL과 anon key 복사
4. SQL Editor에서 Stage 1의 마이그레이션 SQL 실행

---

## 📋 API 설계

### 1. POST /api/admin/exams
**시험 생성**

Request:
\`\`\`json
{
  "title": "2024년 9월 모의고사 변형",
  "description": "9월 모평 1-20번 변형 문제",
  "duration": 70,
  "scheduled_at": "2024-12-10T19:00:00",
  "due_at": "2024-12-10T20:10:00",
  "class_ids": ["1", "2"],
  "shuffle_questions": false,
  "show_answer_after": true
}
\`\`\`

Response:
\`\`\`json
{
  "exam": {
    "id": "uuid",
    "title": "...",
    "total_points": 0,
    ...
  }
}
\`\`\`

### 2. GET /api/admin/exams/template
**엑셀 템플릿 다운로드**

Response: Excel file (.xlsx)

템플릿 구조:
| 번호 | 문제유형 | 지문 | 문제 | 보기1 | 보기2 | 보기3 | 보기4 | 보기5 | 정답 | 배점 | 난이도 | 태그 |
|------|----------|------|------|-------|-------|-------|-------|-------|------|------|--------|------|

### 3. POST /api/admin/exams/[examId]/import
**엑셀 파일 업로드 및 문제 import**

Request: FormData
- file: Excel file

Response:
\`\`\`json
{
  "success": true,
  "questions": [...],
  "totalPoints": 100
}
\`\`\`

### 4. GET /api/admin/exams/[examId]/questions
**시험 문제 목록 조회**

Response:
\`\`\`json
{
  "questions": [
    {
      "id": "uuid",
      "order_index": 1,
      "type": "multiple_choice",
      "content": "다음 중 올바른 것은?",
      "choices": ["A", "B", "C", "D"],
      "correct_answer": "1",
      "points": 5,
      "difficulty": 3,
      "tags": ["문법", "독해"]
    }
  ]
}
\`\`\`

---

## 🎨 UI 플로우

### Step 1: 기본 정보 입력
- 시험 이름 *
- 설명
- 시험 시간 (분)
- 시작 시간
- 마감 시간
- 대상 반 * (체크박스)
- 문제 순서 랜덤 배치
- 제출 후 정답 공개

→ **다음 단계** 버튼 클릭

### Step 2: 엑셀 업로드
1. **템플릿 다운로드**
   - "템플릿 다운로드" 버튼 클릭
   - `exam_template.xlsx` 파일 다운로드

2. **파일 업로드**
   - 템플릿에 문제 작성
   - "파일 선택" 버튼으로 업로드
   - 자동으로 Step 3로 이동

### Step 3: 미리보기
- 업로드된 문제 목록 표시
- 문제별 정보 확인:
  - 문제 번호
  - 문제 유형
  - 문제 내용
  - 보기 (객관식)
  - 정답
  - 배점
  - 난이도
  - 태그

→ **완료** 버튼 클릭 → `/admin/exams`로 이동

---

## 🔄 DB 플로우

### 1. 시험 생성 (Step 1)
\`\`\`sql
-- exams 테이블에 INSERT
INSERT INTO exams (
  academy_id,
  teacher_id,
  title,
  description,
  duration,
  scheduled_at,
  due_at,
  shuffle_questions,
  show_answer_after
) VALUES (...);

-- exam_assignments 테이블에 학생별 할당
-- (class_enrollments에서 student_id 조회)
INSERT INTO exam_assignments (
  exam_id,
  student_id,
  status
) VALUES (...);
\`\`\`

### 2. 문제 import (Step 2)
\`\`\`sql
-- questions 테이블에 INSERT (bulk)
INSERT INTO questions (
  academy_id,
  type,
  content,
  passage,
  choices,
  correct_answer,
  points,
  difficulty,
  tags
) VALUES (...), (...), ...;

-- exam_questions 테이블에 매핑
INSERT INTO exam_questions (
  exam_id,
  question_id,
  order_index
) VALUES (...), (...), ...;

-- exams 테이블의 total_points 업데이트
UPDATE exams
SET total_points = (
  SELECT SUM(points)
  FROM questions q
  JOIN exam_questions eq ON q.id = eq.question_id
  WHERE eq.exam_id = :examId
)
WHERE id = :examId;
\`\`\`

---

## 📊 엑셀 템플릿 예시

| 번호 | 문제유형 | 지문 | 문제 | 보기1 | 보기2 | 보기3 | 보기4 | 보기5 | 정답 | 배점 | 난이도 | 태그 |
|------|----------|------|------|-------|-------|-------|-------|-------|------|------|--------|------|
| 1 | multiple_choice | (지문 있으면 작성) | 다음 중 올바른 것은? | Apple | Banana | Cherry | Date | Elderberry | 1 | 5 | 3 | 문법,독해 |
| 2 | short_answer | | 다음 빈칸에 알맞은 단어는? | | | | | | answer | 3 | 2 | 어휘 |

### 문제 유형
- `multiple_choice`: 객관식 (보기 필수)
- `short_answer`: 단답형 (보기 불필요)
- `essay`: 서술형
- `true_false`: O/X

### 난이도
- 1: 매우 쉬움
- 2: 쉬움
- 3: 보통
- 4: 어려움
- 5: 매우 어려움

### 태그
- 쉼표(,)로 구분
- 예: "문법,독해" → ["문법", "독해"]

---

## 🐛 에러 처리

### 엑셀 파싱 오류
- 빈 행 스킵
- 필수 필드 검증 (문제, 정답)
- 객관식 보기 검증
- 유효성 검사 실패 시 에러 메시지 반환

### API 에러
- 400: 잘못된 요청 (파일 없음, 파싱 실패)
- 500: 서버 오류 (DB 연결 실패, INSERT 실패)

---

## 🎯 다음 단계 (예정)

### 1. 시험 수정/삭제
- PATCH /api/admin/exams/[examId]
- DELETE /api/admin/exams/[examId]

### 2. 문제 개별 수정
- PATCH /api/admin/exams/[examId]/questions/[questionId]
- 드래그 앤 드롭으로 순서 변경

### 3. AI 해설 생성
- POST /api/admin/questions/[questionId]/explanation
- OpenAI/Claude API 연동

### 4. 시험 미리보기
- /admin/exams/[examId]/preview
- 학생 화면과 동일한 UI

### 5. 시험 복제
- POST /api/admin/exams/[examId]/duplicate
- 문제 포함해서 전체 복사

---

## 💡 사용 팁

### 대량 문제 입력
1. 템플릿 다운로드
2. 엑셀에서 복사/붙여넣기로 빠르게 입력
3. 한 번에 최대 100문제까지 권장

### 문제 재사용
- questions 테이블에 저장된 문제는 다른 시험에서도 재사용 가능
- 나중에 "문제 은행"기능으로 검색/필터 추가 예정

### 반 단위 할당
- 체크박스로 여러 반 선택 가능
- class_enrollments를 통해 자동으로 학생별 할당

---

**모의고사 생성 플로우 완료! 🎉**

다음 명령어로 테스트하세요:
\`\`\`bash
npm install @supabase/supabase-js xlsx
npm run dev
\`\`\`

http://localhost:3000/admin/exams/new
