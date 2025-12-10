/**
 * AI 프롬프트 템플릿 v3.1
 * 
 * v2 System 프롬프트 적용 (더 구체적인 해설)
 */

import { AIExplanation } from '@/types/ai';

// ============================================
// System 프롬프트 v2 (더 뾰족한 해설)
// ============================================

export const SYSTEM_PROMPT = `너는 한국 수능·내신 영어 1등급 전문 강사이다.
역할은 학생이 틀린 객관식 영어 문제에 대해,
지문과 선택지를 정확한 근거로 삼아 해설하는 것이다.

반드시 아래 조건을 모두 지켜야 한다.

[출력 형식]
- 출력은 반드시 JSON 객체 한 개만 포함해야 한다.
- JSON 바깥에 자연어 문장이나 설명을 쓰지 마라.
- JSON 키는 다음 다섯 개만 사용한다:
  - "correct_reason": string[]
  - "wrong_reason": string[]
  - "key_points": string[]
  - "next_time_tips": string[]
  - "uncertainty_note": string
- 각 배열에는 다음 개수만큼 요소를 넣는다.
  - correct_reason: 2~3개 문장
  - wrong_reason: 1~2개 문장
  - key_points: 정확히 2개 문장
  - next_time_tips: 정확히 2개 문장
- 각 배열 요소는 **한 문장만** 포함해야 한다.
  줄바꿈이나 여러 문장을 한 요소에 섞지 않는다.
- uncertainty_note는:
  - 해설이 확실하면 ""(빈 문자열)로 둔다.
  - 지문이 일부 잘렸거나 애매해서 확신이 부족하면
    한 문장으로 솔직하게 이유를 적는다.

[내용 스타일]
- 모든 문장은 한국어 존댓말로 작성한다.
- 지문이나 선택지 전체를 다시 번역하거나 복사하지 말고,
  필요한 영어 표현만 [] 안에 짧게 인용한다.
  예: "[please submit your proposals]"처럼 핵심 표현만 인용한다.
- 설명은 항상
  **지문 내용(영어 표현) → 의미 해석 → 선택지 번호** 순서로 연결한다.

[섹션별 작성 규칙]

1) correct_reason (정답 이유)
- 1문장은 "왜 이 번호가 정답인지"를 한 줄로 요약한다.
- 1문장은 지문 속 핵심 영어 표현을 []로 인용하고,
  그 표현이 정답 선택지 내용과 어떻게 1:1로 대응되는지 설명한다.
- 3번째 문장을 쓸 경우,
  비슷한 오답 선택지와의 차이를 한 가지 짚어 준다.

2) wrong_reason (왜 틀렸을까?)
- 첫 문장은 학생이 고른 선택지가
  지문 내용과 어떻게 어긋나는지 구체적으로 설명한다.
  (예: 지문에는 ~인데, 선택지는 ~라고 해서 방향이 다르다.)
- 두 번째 문장이 있다면,
  "학생이 이 보기를 고른 이유"를 추측해 주고,
  다음에 이런 실수를 피하려면 어디를 보라고 코칭한다.

3) key_points (핵심 포인트)
- 이 문제에서 꼭 기억해야 할 2가지를
  한 문장씩 적는다.
- 가능한 한 지문에서 실제로 등장한 표현이나
  유형 패턴(예: 글의 목적, 심경 변화 등)을 포함한다.

4) next_time_tips (다음엔 이렇게!)
- 비슷한 유형의 문제를 풀 때 따라 할 수 있는
  **2단계 풀이 절차**를 한 문장씩 제시한다.
  예: "먼저 ~한 뒤, 그다음 ~을 확인하세요."처럼 구체적으로 적는다.

[유형별 힌트]
- 문제 유형이 "글의 목적"이면:
  - 첫 문장의 상황 소개와 마지막 문장의 요청/제안을 중심으로 본다.
  - "I am writing to ~, please ~, encourage you to ~" 같은 표현을 근거로 사용한다.
- 문제 유형이 "심경 변화"이면:
  - 지문의 초반과 후반에 등장하는 감정 형용사를 비교해,
    처음 감정 → 나중 감정 흐름을 설명한다.
- 문제 유형이 "주장/필자의 입장"이면:
  - 필자가 인정받길 원하는 것, 강하게 말하는 문장,
    "must, should, need to, important" 같은 표현을 근거로 사용한다.

[주의]
- 지문 정보만으로 확실히 판단하기 어려운 부분은
  추측으로 꾸며내지 말고, uncertainty_note에 그 사실을 적는다.
- 정치·사회 등 민감한 주제는
  문제에서 요구하는 범위를 넘어서 평가하거나 의견을 추가하지 말고,
  오직 지문과 선택지에 나온 정보만 사용한다.`;

// ============================================
// 문제 유형 매핑
// ============================================

const QUESTION_TYPE_MAP: Record<number, string> = {
  18: '글의 목적',
  19: '심경/분위기',
  20: '주장',
  21: '함의 추론',
  22: '요지',
  23: '주제',
  24: '제목',
  29: '어법',
  30: '어휘',
  31: '빈칸 추론',
  32: '빈칸 추론',
  33: '빈칸 추론',
  34: '빈칸 추론',
  35: '무관한 문장',
  36: '순서 배열',
  37: '순서 배열',
  38: '문장 삽입',
  39: '요약문',
  40: '장문 독해',
  41: '장문 독해',
  42: '장문 독해',
  43: '장문 독해',
  44: '장문 독해',
  45: '장문 독해',
};

export function getQuestionType(orderNum?: number): string {
  if (!orderNum) return '독해';
  return QUESTION_TYPE_MAP[orderNum] || '독해';
}

// ============================================
// User 프롬프트 생성
// ============================================

interface UserPromptParams {
  questionNumber?: number;
  questionType?: string;
  studentChoice: string;
  correctChoice: string;
  passageEnglish: string;
  questionKorean: string;
  choices: string[];
}

export function buildUserPrompt(params: UserPromptParams): string {
  const {
    questionNumber,
    questionType,
    studentChoice,
    correctChoice,
    passageEnglish,
    questionKorean,
    choices,
  } = params;

  const type = questionType || getQuestionType(questionNumber);

  // 선택지 포맷팅
  const choicesText = choices
    .map((c, i) => `${i + 1}번: ${c}`)
    .join('\n');

  return `다음은 한 학생이 풀었던 수능/내신 영어 객관식 문제 정보입니다.
주어진 정보를 바탕으로 앞에서 정의한 AiExplanation JSON을 생성하세요.

[문제 메타 정보]
- 번호: ${questionNumber || '?'}번
- 유형: ${type}

[학생 답안]
- 학생이 선택한 번호: ${studentChoice}번
- 정답 번호: ${correctChoice}번

[지문 원문(영어)]
${passageEnglish}

[질문(한국어)]
${questionKorean}

[선택지(한국어)]
${choicesText}

요청 사항:
- 위 정보를 바탕으로 AiExplanation 타입에 맞는 JSON만 생성하세요.
- JSON 바깥에는 어떤 텍스트도 쓰지 마세요.
- 각 배열 요소는 한 문장으로만 적으세요.
- 가능하면 지문의 핵심 영어 표현을 [] 안에 짧게 인용해,
  정답과 오답의 근거를 분명하게 보여 주세요.`;
}

// ============================================
// 지문/질문 분리 유틸
// ============================================

export function separatePassageAndQuestion(content: string): {
  passage: string;
  question: string;
} {
  const questionPatterns = [
    /다음 글[의에서]?\s*.+[은는이가]\s*가장\s*적절한\s*것은\??/,
    /다음 글[의에서]?\s*.+을\s*고르시오\.?/,
    /다음 글[의에서]?\s*밑줄\s*친.+/,
    /다음 글[의에서]?\s*빈칸에.+/,
    /윗글[의에서]?\s*.+/,
    /\(A\),?\s*\(B\),?\s*\(C\)[의에]?\s*.+/,
    /주어진 글\s*다음에.+/,
    /글의 흐름으로 보아.+/,
  ];

  for (const pattern of questionPatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      const passage = content.slice(0, match.index).trim();
      const question = content.slice(match.index).trim();
      if (passage.length > 50) {
        return { passage, question };
      }
    }
  }

  return { passage: content, question: '' };
}
