import { NextRequest, NextResponse } from 'next/server';
import { extractQuestionsFromImages } from '@/lib/ai/vision';
import { getPDFPageInfo } from '@/lib/parsers/pdf-to-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/exams/upload
 * 
 * 클라이언트에서 렌더링한 이미지를 받아서 Vision API로 파싱
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== PDF Upload API 시작 ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const date = formData.get('date') as string;
    const imagesJson = formData.get('images') as string;
    
    console.log('파일 정보:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      hasImages: !!imagesJson,
    });
    
    if (!file) {
      return NextResponse.json(
        { error: '파일을 업로드해주세요.' },
        { status: 400 }
      );
    }

    // PDF 메타데이터 추출
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfInfo = await getPDFPageInfo(buffer);
    
    console.log(`PDF 페이지 수: ${pdfInfo.pageCount}`);

    // 클라이언트에서 렌더링한 이미지가 있으면 사용
    let extractedQuestions = [];
    
    if (imagesJson) {
      try {
        const images: string[] = JSON.parse(imagesJson);
        console.log(`클라이언트 렌더링 이미지: ${images.length}개`);
        
        // OpenAI API 키 확인
        if (!process.env.OPENAI_API_KEY) {
          console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다.');
          return createSampleResponse(file, pdfInfo.pageCount);
        }

        // Vision API로 문제 추출
        console.log('Vision API 호출 중...');
        extractedQuestions = await extractQuestionsFromImages(images);
        console.log(`추출된 문제: ${extractedQuestions.length}개`);
        
      } catch (parseError) {
        console.error('이미지 파싱 에러:', parseError);
        return createSampleResponse(file, pdfInfo.pageCount);
      }
    } else {
      console.log('이미지 없음, 샘플 데이터 반환');
      return createSampleResponse(file, pdfInfo.pageCount);
    }

    // 응답 생성
    const questions = extractedQuestions.map(q => ({
      questionNumber: q.questionNumber,
      type: q.type,
      content: q.questionText,
      choices: q.choices,
      passage: (q as any).passage,
    }));

    console.log('=== PDF Upload 성공 ===');

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          title: title || '제목 없음',
          subject: subject || '영어',
          date: date || new Date().toISOString().split('T')[0],
          questions,
          metadata: {
            totalPages: pdfInfo.pageCount,
            totalQuestions: questions.length,
            source: 'PDF',
            processingMethod: 'OpenAI Vision API',
          },
        },
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          pages: pdfInfo.pageCount,
        },
      },
    });
    
  } catch (error) {
    console.error('=== Upload error ===');
    console.error('Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'PDF 처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * 샘플 응답 생성
 */
function createSampleResponse(file: File, pageCount: number) {
  const sampleQuestions = [
    {
      questionNumber: 18,
      type: 'multiple_choice',
      content: '다음 글의 목적으로 가장 적절한 것은? (샘플)',
      choices: [
        '동아리 활동에 대한 만족도를 조사하려고',
        '동아리 개설 제안서 제출을 독려하려고',
        '체험 활동 결과 보고서를 요청하려고',
      ],
    },
    {
      questionNumber: 19,
      type: 'multiple_choice',
      content: '다음 글에 드러난 Sophie의 심경 변화로 가장 적절한 것은? (샘플)',
      choices: [
        'confused → pleased',
        'confident → embarrassed',
      ],
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      exam: {
        title: '샘플 모의고사',
        subject: '영어',
        date: new Date().toISOString().split('T')[0],
        questions: sampleQuestions,
        metadata: {
          totalPages: pageCount,
          totalQuestions: sampleQuestions.length,
          source: 'PDF (Sample)',
          processingMethod: 'Sample Data',
        },
      },
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        pages: pageCount,
      },
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Exam upload API (with Vision) is running',
    runtime: 'nodejs',
  });
}
