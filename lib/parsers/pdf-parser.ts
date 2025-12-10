/**
 * PDF 파서 (OpenAI Vision 통합)
 */

import { convertPDFToImages, getPDFPageInfo } from './pdf-to-image';
import { extractQuestionsFromImages } from '@/lib/ai/vision';

export interface ParsedQuestion {
  questionNumber: number;
  type: 'multiple_choice' | 'short_answer' | 'listening';
  content: string;
  choices?: string[];
  answer?: string;
  passage?: string;
  imageUrl?: string;
}

export interface ParsedExam {
  title: string;
  subject: string;
  date: string;
  questions: ParsedQuestion[];
  metadata: {
    totalPages: number;
    totalQuestions: number;
    source: string;
    processingMethod: string;
  };
}

/**
 * OpenAI Vision을 사용한 PDF 파싱
 */
export async function parseExamPDF(
  fileBuffer: Buffer,
  examInfo: {
    title: string;
    subject: string;
    date: string;
  }
): Promise<ParsedExam> {
  console.log('=== PDF 파싱 시작 (Vision API) ===');
  
  try {
    // 1. PDF 정보 추출
    console.log('1. PDF 메타데이터 추출 중...');
    const pdfInfo = await getPDFPageInfo(fileBuffer);
    console.log(`페이지 수: ${pdfInfo.pageCount}`);

    // 2. PDF → 이미지 변환
    console.log('2. PDF를 이미지로 변환 중...');
    const images = await convertPDFToImages(fileBuffer);
    console.log(`변환된 이미지: ${images.length}개`);

    // 3. Vision API로 문제 추출
    console.log('3. Vision API로 문제 추출 중...');
    
    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다. 샘플 데이터를 반환합니다.');
      return createSampleExam(examInfo, pdfInfo.pageCount);
    }

    const extractedQuestions = await extractQuestionsFromImages(images);
    console.log(`추출된 문제: ${extractedQuestions.length}개`);

    // 4. 데이터 구조 변환
    const questions: ParsedQuestion[] = extractedQuestions.map(q => ({
      questionNumber: q.questionNumber,
      type: q.type,
      content: q.questionText,
      choices: q.choices,
      passage: (q as any).passage,
    }));

    console.log('=== PDF 파싱 완료 ===');

    return {
      title: examInfo.title,
      subject: examInfo.subject,
      date: examInfo.date,
      questions,
      metadata: {
        totalPages: pdfInfo.pageCount,
        totalQuestions: questions.length,
        source: 'PDF',
        processingMethod: 'OpenAI Vision API',
      },
    };

  } catch (error) {
    console.error('PDF 파싱 에러:', error);
    
    // 에러 발생 시 샘플 데이터 반환
    console.warn('⚠️ 에러 발생. 샘플 데이터를 반환합니다.');
    return createSampleExam(examInfo, 8);
  }
}

/**
 * 샘플 시험 데이터 생성
 */
function createSampleExam(
  examInfo: { title: string; subject: string; date: string },
  pageCount: number
): ParsedExam {
  const sampleQuestions: ParsedQuestion[] = [
    {
      questionNumber: 18,
      type: 'multiple_choice',
      content: '다음 글의 목적으로 가장 적절한 것은?',
      passage: 'Dear students, I am Amanda Clark, the school club director...',
      choices: [
        '동아리 활동에 대한 만족도를 조사하려고',
        '동아리 개설 제안서 제출을 독려하려고',
        '체험 활동 결과 보고서를 요청하려고',
        '동아리 신규 회원 모집을 공지하려고',
        '방과 후 활동 프로그램을 설명하려고',
      ],
    },
    {
      questionNumber: 19,
      type: 'multiple_choice',
      content: '다음 글에 드러난 Sophie의 심경 변화로 가장 적절한 것은?',
      passage: '"Where could it be?" Sophie asked herself...',
      choices: [
        'confused → pleased',
        'confident → embarrassed',
        'thrilled → anxious',
        'relieved → nervous',
        'bored → excited',
      ],
    },
    {
      questionNumber: 20,
      type: 'multiple_choice',
      content: '다음 글에서 필자가 주장하는 바로 가장 적절한 것은?',
      passage: 'The study of literature has repeatedly failed to recognize...',
      choices: [
        '독특하고 복합적인 이미지 표현 기법을 작사 과정에 적용해야 한다.',
        '가사를 통해 작사가들이 언어와 문학에 기여한 바를 인정해야 한다.',
        '셰익스피어의 작품이 영문학 발전에 미친 영향을 분석해야 한다.',
        '문학 작품을 감상하기 위해 스토리텔링 기법을 이해해야 한다.',
        '문학 작품과 가사에 사용되는 언어의 차이를 연구해야 한다.',
      ],
    },
  ];

  return {
    ...examInfo,
    questions: sampleQuestions,
    metadata: {
      totalPages: pageCount,
      totalQuestions: sampleQuestions.length,
      source: 'PDF (Sample)',
      processingMethod: 'Sample Data (Vision API 미사용)',
    },
  };
}

/**
 * PDF 메타데이터 추출
 */
export async function getPDFMetadata(fileBuffer: Buffer) {
  try {
    const info = await getPDFPageInfo(fileBuffer);
    return {
      pages: info.pageCount,
      textLength: fileBuffer.length,
      info: {
        valid: true,
        size: fileBuffer.length,
        pageInfo: info.pages,
      },
    };
  } catch (error) {
    console.error('메타데이터 추출 에러:', error);
    return {
      pages: 0,
      textLength: 0,
      info: { valid: false },
    };
  }
}
