# ✅ Stage 4-1 완료: OpenAI API 공통 헬퍼 모듈

## 📋 **[요청 1] 설계 결정** ✅

### 클라이언트 선택: OpenAI 공식 SDK

**선택 이유:**
1. ✅ 타입 안정성 (TypeScript 내장)
2. ✅ 표준 방법 (OpenAI 공식 권장)
3. ✅ 자동 재시도 (네트워크 오류 처리)
4. ✅ 스트리밍 지원 (향후 확장)
5. ✅ 공식 유지보수

**비교:**

| 항목 | OpenAI SDK | fetch (직접) |
|------|-----------|-------------|
| 타입 안정성 | ✅ 내장 | ❌ 수동 |
| 에러 처리 | ✅ 자동 | ❌ 수동 |
| 재시도 로직 | ✅ 내장 | ❌ 수동 |
| 스트리밍 | ✅ 간단 | ❌ 복잡 |
| 유지보수 | ✅ 공식 | ❌ 직접 |

**결론:** OpenAI SDK = **안전하고 표준적**

---

### 파일 구조

```
lib/ai/
├── types.ts       # AI 타입 정의
├── openai.ts      # OpenAI 클라이언트 + 공통 메서드
├── prompts.ts     # 프롬프트 템플릿
└── index.ts       # 통합 export
```

---

## 🛠️ **[요청 2] 코드 구현** ✅

### 1. types.ts (타입 정의)

**주요 타입:**

```typescript
// 요청
- TextModelParams
- VisionModelParams

// 응답
- AIResponse (content, usage, model, finishReason)
- AIResult<T> (성공/실패 Result 타입)

// 프롬프트 파라미터
- QuestionExplanationParams
- WeaknessAnalysisParams
- ExamParsingParams
```

**Result 패턴:**
```typescript
type AIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

---

### 2. openai.ts (핵심 로직)

**기능:**

#### A. 클라이언트 싱글톤
```typescript
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}
```

#### B. callTextModel
```typescript
export async function callTextModel(
  params: TextModelParams
): Promise<AIResult<AIResponse>> {
  try {
    const client = getOpenAIClient();
    const model = params.model || getTextModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    });

    return { success: true, data: { content, usage, model, finishReason } };
  } catch (error) {
    return { success: false, error: errorMessage, code: errorCode };
  }
}
```

#### C. callVisionModel
```typescript
export async function callVisionModel(
  params: VisionModelParams
): Promise<AIResult<AIResponse>> {
  // imageUrl or imageBase64 받음
  // image_url content type으로 전송
  // 나머지 로직은 callTextModel과 동일
}
```

**에러 처리:**
- ✅ OpenAI 에러 코드 추출
- ✅ 콘솔 로그
- ✅ Result 타입 반환 (throw 안 함)

---

### 3. prompts.ts (프롬프트 템플릿)

**구현된 프롬프트 3개:**

#### A. buildQuestionExplanationPrompt
```typescript
// 입력: questionType, questionText, choices, correctAnswer, studentAnswer, isCorrect
// 출력: { systemPrompt, userPrompt }

systemPrompt:
- 영어 문제 해설 전문가
- 명확하고 친절한 한국어
- 구조: 정답 확인 → 핵심 개념 → 오답 분석 → 팁

userPrompt:
- 문제 + 보기 + 정답 + 학생 답 + 채점 결과
- 틀린 경우 집중 설명 요청
```

#### B. buildWeaknessAnalysisPrompt
```typescript
// 입력: examTitle, totalQuestions, correctCount, wrongCount, wrongQuestions
// 출력: { systemPrompt, userPrompt }

systemPrompt:
- 교육 전문가
- 약점 파악 + 개선 방향
- 구조: 성적 요약 → 약점 분석 → 실수 패턴 → 개선 방향

userPrompt:
- 시험 정보 + 오답 상세 (분야, 난이도 포함)
- 4가지 분석 요청 (약점, 패턴, 학습 전략)
```

#### C. buildExamParsingPrompt
```typescript
// 입력: examType, language
// 출력: { systemPrompt, userPrompt }

systemPrompt:
- 시험 이미지 분석 전문가
- JSON 형식 출력

userPrompt:
- 유형 + 언어 명시
- JSON 스키마 제공
- 인식 불명확 시 "UNCLEAR" 표시
```

---

### 4. index.ts (통합 Export)

```typescript
// OpenAI 클라이언트
export { callTextModel, callVisionModel } from './openai';

// 프롬프트 빌더
export { buildQuestionExplanationPrompt, ... } from './prompts';

// 타입
export type { TextModelParams, AIResponse, AIResult, ... } from './types';
```

---

### 5. 환경 변수

```.env.example
OPENAI_API_KEY=sk-...
OPENAI_MODEL_TEXT=gpt-4o-mini
OPENAI_MODEL_VISION=gpt-4o
```

---

## 📝 **[요청 3] 사용 예시** ✅

### 예시 1: 문항 해설 생성

```typescript
// API Route: /api/student/questions/[questionId]/explanation

import { callTextModel, buildQuestionExplanationPrompt } from '@/lib/ai';

export async function GET(request, { params }) {
  // 1. DB에서 question + answer 조회
  const question = await supabase...;
  const answer = await supabase...;

  // 2. 프롬프트 생성
  const { systemPrompt, userPrompt } = buildQuestionExplanationPrompt({
    questionType: question.type,
    questionText: question.content,
    choices: question.options,
    correctAnswer: question.correct_answer,
    studentAnswer: answer.answer,
    isCorrect: answer.is_correct,
  });

  // 3. AI 호출
  const result = await callTextModel({
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 1500,
  });

  // 4. 에러 처리
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 5. 응답
  return NextResponse.json({
    explanation: result.data.content,
    usage: result.data.usage,
  });
}
```

**출력 예시:**
```
"정답은 2번 Paris입니다.

Paris는 프랑스의 수도이자 가장 큰 도시입니다.

학생이 선택한 1번 London은 영국의 수도입니다.
France(프랑스)와 England(영국)를 혼동하신 것 같습니다.

팁: 유럽 주요 국가의 수도를 정리해서 암기하세요."
```

---

### 예시 2: 시험 약점 분석

```typescript
// API Route: /api/student/submissions/[submissionId]/analysis

import { callTextModel, buildWeaknessAnalysisPrompt } from '@/lib/ai';

export async function GET(request, { params }) {
  // 1. DB에서 submission + answers 조회
  const submission = await supabase
    .from('submissions')
    .select(`*, exam(*), answers:submission_answers(*, question:questions(*))`)
    .eq('id', params.submissionId)
    .single();

  // 2. 오답만 필터링
  const wrongAnswers = submission.answers.filter(a => !a.is_correct);

  // 3. 프롬프트 생성
  const { systemPrompt, userPrompt } = buildWeaknessAnalysisPrompt({
    examTitle: submission.exam.title,
    totalQuestions: submission.answers.length,
    correctCount: submission.answers.filter(a => a.is_correct).length,
    wrongCount: wrongAnswers.length,
    wrongQuestions: wrongAnswers.map(a => ({
      questionText: a.question.content,
      category: a.question.category,
      difficulty: a.question.difficulty,
      studentAnswer: a.answer,
      correctAnswer: a.question.correct_answer,
    })),
  });

  // 4. AI 호출
  const result = await callTextModel({
    systemPrompt,
    userPrompt,
    temperature: 0.8, // 창의적 분석
    maxTokens: 2500,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 5. DB 저장 (선택)
  await supabase.from('ai_analysis').insert({
    submission_id: params.submissionId,
    analysis_type: 'weakness',
    content: result.data.content,
    model: result.data.model,
    tokens: result.data.usage?.totalTokens,
  });

  // 6. 응답
  return NextResponse.json({
    analysis: result.data.content,
    usage: result.data.usage,
  });
}
```

**출력 예시:**
```
## 전체 성적 요약
- 정답률: 84% (38/45문제)
- 전체적으로 양호한 수준입니다.

## 주요 약점
1. **어휘 문제** (7문제 중 4문제 오답)
   - 고난도 어휘 문제에서 약점을 보입니다.
   - 특히 추상적 개념 어휘에 취약합니다.

2. **빈칸 추론** (3문제 오답)
   - 문맥 파악은 되지만 정답 선택에서 실수

## 학습 전략
1. 고난도 어휘 리스트 매일 20개씩 암기
2. 빈칸 문제는 소거법 연습
3. 시간 분배 연습 (어휘 5분 → 빈칸 10분)
```

---

### 예시 3: 시험 이미지 파싱 (Vision)

```typescript
// API Route: /api/admin/exams/parse-image

import { callVisionModel, buildExamParsingPrompt } from '@/lib/ai';

export async function POST(request) {
  // 1. 이미지 파일 받기
  const formData = await request.formData();
  const file = formData.get('image') as File;
  
  // 2. Base64 변환
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // 3. 프롬프트 생성
  const { systemPrompt, userPrompt } = buildExamParsingPrompt({
    examType: 'multiple_choice',
    language: 'ko',
  });

  // 4. Vision AI 호출
  const result = await callVisionModel({
    systemPrompt,
    userPrompt,
    imageBase64: base64,
    temperature: 0.3, // 정확도 우선
    maxTokens: 4000,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 5. JSON 파싱
  const parsed = JSON.parse(result.data.content);
  
  return NextResponse.json({
    questions: parsed.questions,
    count: parsed.questions.length,
    usage: result.data.usage,
  });
}
```

**출력 예시:**
```json
{
  "questions": [
    {
      "question_number": 1,
      "question_type": "mcq",
      "question_text": "What is the capital of France?",
      "choices": ["London", "Paris", "Berlin", "Madrid", "Rome"],
      "correct_answer": "2"
    }
  ]
}
```

---

## 📁 **생성된 파일 (5개)**

```
✅ lib/ai/types.ts           (~150 lines) - 타입 정의
✅ lib/ai/openai.ts          (~200 lines) - OpenAI 클라이언트
✅ lib/ai/prompts.ts         (~250 lines) - 프롬프트 템플릿
✅ lib/ai/index.ts           (~30 lines)  - 통합 export
✅ .env.example              - 환경 변수 예시
```

---

## 🎯 **핵심 기능**

### 1. 안전한 클라이언트 관리
```typescript
// 싱글톤 패턴
// 환경 변수 검증
// 서버 전용 (클라이언트 import 금지)
```

### 2. Result 타입 패턴
```typescript
type AIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// throw 안 함 → 안정적 에러 처리
```

### 3. 재사용 가능한 프롬프트
```typescript
// 함수형 템플릿
// 파라미터 타입 정의
// system + user 분리
```

---

## 📊 **사용 패턴**

### 패턴 1: 기본 사용
```typescript
const { systemPrompt, userPrompt } = buildQuestionExplanationPrompt(params);
const result = await callTextModel({ systemPrompt, userPrompt });

if (!result.success) {
  console.error(result.error);
  return fallback;
}

return result.data.content;
```

### 패턴 2: 여러 프롬프트 순차
```typescript
const weakness = await callTextModel(buildWeaknessAnalysisPrompt(...));
const studyPlan = await callTextModel(buildStudyPlanPrompt(...));
const similar = await callTextModel(buildSimilarQuestionPrompt(...));
```

### 패턴 3: 병렬 처리
```typescript
const promises = questions.map(q => 
  callTextModel(buildQuestionExplanationPrompt(q))
);
const results = await Promise.all(promises);
```

---

## ⚠️ **주의사항**

### 1. 환경 변수 필수
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL_TEXT=gpt-4o-mini
OPENAI_MODEL_VISION=gpt-4o
```

### 2. 패키지 설치
```bash
npm install openai
```

### 3. 서버 전용
```typescript
// ❌ 클라이언트 컴포넌트에서 import 금지
import { callTextModel } from '@/lib/ai'; // 에러!

// ✅ API Route에서만 사용
// app/api/...
```

### 4. 에러 처리
```typescript
// 항상 result.success 체크
if (!result.success) {
  // fallback 처리
}
```

---

## 💰 **비용 최적화**

### 1. 모델 선택
```typescript
// 간단한 작업: gpt-4o-mini (저렴)
model: 'gpt-4o-mini'

// 복잡한 작업: gpt-4o (고품질)
model: 'gpt-4o'
```

### 2. 캐싱
```typescript
// Redis 또는 DB에 결과 캐싱
const cached = await redis.get(`explanation:${questionId}`);
if (cached) return cached;
```

### 3. 배치 처리
```typescript
// 여러 문제를 한 번에 요청
// 3번 호출 → 1번 호출 (토큰 절약)
```

---

## 🚀 **다음 단계 (Stage 4-2)**

### 실제 API 연동
1. ✅ 문항 해설 API 구현
2. ✅ 약점 분석 API 구현
3. ✅ 프론트엔드 연동

### 추가 프롬프트
1. 유사 문제 생성
2. 학습 계획 수립
3. 문제 난이도 분석

### 성능 개선
1. 스트리밍 응답
2. 캐싱 전략
3. 토큰 최적화

---

## ✅ **Stage 4-1 완료!**

**완료 항목:**
- ✅ OpenAI SDK 선택 (안전하고 표준적)
- ✅ 파일 구조 설계 (types, openai, prompts, index)
- ✅ callTextModel / callVisionModel 구현
- ✅ 3개 프롬프트 템플릿 구현
- ✅ Result 타입 패턴 적용
- ✅ 에러 처리 + 로깅
- ✅ 사용 예시 3개 작성
- ✅ 환경 변수 설정

**준비 완료!** 🎉

이제 AI 기능을 쉽게 추가할 수 있습니다:

```typescript
import { callTextModel, buildQuestionExplanationPrompt } from '@/lib/ai';

// 3줄로 AI 해설 생성
const prompts = buildQuestionExplanationPrompt(params);
const result = await callTextModel(prompts);
const explanation = result.data.content;
```
