/**
 * OpenAI Vision API를 사용한 PDF 파싱
 * 
 * ⚠️ 서버 전용! 클라이언트에서 import 금지
 */

import OpenAI from 'openai';
import { getServerConfig } from '@/lib/config/env';

// 싱글톤 클라이언트
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const config = getServerConfig();
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }
  return openaiClient;
}

export interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  choices: string[];
  type: 'multiple_choice' | 'listening' | 'short_answer';
}

/**
 * 이미지에서 수능 문제를 추출하는 프롬프트
 */
const EXAM_EXTRACTION_PROMPT = `
당신은 한국 수능 영어 문제지를 분석하는 전문가입니다.

이미지에서 다음 정보를 JSON 형식으로 추출해주세요:

1. 문제 번호
2. 문제 본문 (질문)
3. 선택지 (①~⑤)
4. 지문 (있는 경우)

**출력 형식 (JSON):**
{
  "questions": [
    {
      "questionNumber": 18,
      "questionText": "다음 글의 목적으로 가장 적절한 것은?",
      "passage": "영어 지문 전체...",
      "choices": [
        "동아리 활동에 대한 만족도를 조사하려고",
        "동아리 개설 제안서 제출을 독려하려고",
        "체험 활동 결과 보고서를 요청하려고",
        "동아리 신규 회원 모집을 공지하려고",
        "방과 후 활동 프로그램을 설명하려고"
      ]
    }
  ]
}

**주의사항:**
- 문제 번호는 정확히 추출
- 선택지 기호(①②③④⑤)는 제거하고 내용만
- 지문이 있으면 passage 필드에 포함
- 듣기 문제(1~17번)는 "listening", 나머지는 "multiple_choice"
- 반드시 유효한 JSON 형식으로 응답
`;

/**
 * GPT-4 Vision으로 이미지에서 문제 추출
 */
export async function extractQuestionsFromImage(
  imageBase64: string
): Promise<ExtractedQuestion[]> {
  try {
    console.log('GPT-4 Vision API 호출 시작...');
    
    const config = getServerConfig();
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: config.openaiModelVision,
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: EXAM_EXTRACTION_PROMPT 
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT-4 Vision 응답이 비어있습니다.');
    }

    console.log('GPT-4 Vision 응답:', content.substring(0, 200));

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('JSON을 찾을 수 없음:', content);
      throw new Error('응답에서 JSON을 찾을 수 없습니다.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions || [];

    console.log(`추출된 문제 수: ${questions.length}`);

    return questions.map((q: any) => ({
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      choices: q.choices || [],
      passage: q.passage,
      type: q.questionNumber <= 17 ? 'listening' : 'multiple_choice',
    }));

  } catch (error) {
    console.error('Vision API 에러:', error);
    if (error instanceof Error) {
      throw new Error(`문제 추출 실패: ${error.message}`);
    }
    throw new Error('문제 추출 중 알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * 여러 이미지에서 문제 일괄 추출
 */
export async function extractQuestionsFromImages(
  imageBase64Array: string[]
): Promise<ExtractedQuestion[]> {
  console.log(`총 ${imageBase64Array.length}개 이미지 처리 시작`);
  
  const allQuestions: ExtractedQuestion[] = [];

  for (let i = 0; i < imageBase64Array.length; i++) {
    console.log(`이미지 ${i + 1}/${imageBase64Array.length} 처리 중...`);
    
    const imageBase64 = imageBase64Array[i];
    if (!imageBase64) {
      console.warn(`이미지 ${i + 1}이 비어있음`);
      continue;
    }
    
    try {
      const questions = await extractQuestionsFromImage(imageBase64);
      allQuestions.push(...questions);
      
      // Rate limit 방지 (1초 대기)
      if (i < imageBase64Array.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`이미지 ${i + 1} 처리 실패:`, error);
    }
  }

  console.log(`총 ${allQuestions.length}개 문제 추출 완료`);
  
  return allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
}
