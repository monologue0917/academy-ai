import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';


export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/exams/template
 * 
 * 시험 문제 엑셀 템플릿 다운로드
 * 
 * 템플릿 컬럼:
 * - question_number: 문제 번호
 * - question_type: mcq(객관식) | short_answer(단답형) | essay(서술형)
 * - question_text: 문제 지문
 * - choices: 보기 (|| 구분자로 연결, 예: "A||B||C||D||E")
 * - correct_answer: 정답 (객관식: 인덱스 1-5, 단답형/서술형: 텍스트)
 * - score: 배점 (선택, default 1)
 */
export async function GET(request: NextRequest) {
  try {
    // 엑셀 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('문제 목록');

    // 컬럼 정의
    worksheet.columns = [
      { header: 'question_number', key: 'question_number', width: 15 },
      { header: 'question_type', key: 'question_type', width: 20 },
      { header: 'question_text', key: 'question_text', width: 50 },
      { header: 'choices', key: 'choices', width: 40 },
      { header: 'correct_answer', key: 'correct_answer', width: 20 },
      { header: 'score', key: 'score', width: 10 },
    ];

    // 헤더 스타일링
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // indigo-600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 예시 데이터 추가
    worksheet.addRow({
      question_number: 1,
      question_type: 'mcq',
      question_text: 'What is the capital of France?',
      choices: 'London||Paris||Berlin||Madrid||Rome',
      correct_answer: '2',
      score: 1,
    });

    worksheet.addRow({
      question_number: 2,
      question_type: 'mcq',
      question_text: 'Which planet is known as the Red Planet?',
      choices: 'Venus||Mars||Jupiter||Saturn||Neptune',
      correct_answer: '2',
      score: 1,
    });

    worksheet.addRow({
      question_number: 3,
      question_type: 'short_answer',
      question_text: 'What year did World War II end?',
      choices: '',
      correct_answer: '1945',
      score: 2,
    });

    // 설명 시트 추가
    const instructionSheet = workbook.addWorksheet('작성 안내');
    instructionSheet.columns = [
      { header: '컬럼명', key: 'column', width: 20 },
      { header: '설명', key: 'description', width: 60 },
      { header: '예시', key: 'example', width: 40 },
    ];

    // 설명 헤더 스타일
    const instrHeaderRow = instructionSheet.getRow(1);
    instrHeaderRow.font = { bold: true };
    instrHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // 설명 내용
    instructionSheet.addRows([
      {
        column: 'question_number',
        description: '문제 번호 (1부터 시작)',
        example: '1, 2, 3, ...',
      },
      {
        column: 'question_type',
        description: '문제 유형',
        example: 'mcq (객관식) | short_answer (단답형) | essay (서술형)',
      },
      {
        column: 'question_text',
        description: '문제 지문 (영어 또는 한글)',
        example: 'What is the capital of France?',
      },
      {
        column: 'choices',
        description: '객관식 보기 (|| 구분자 사용, 최대 5개)',
        example: 'London||Paris||Berlin||Madrid||Rome',
      },
      {
        column: 'correct_answer',
        description: '정답 (객관식: 1-5, 단답/서술: 텍스트)',
        example: '2 (객관식) | 1945 (단답형)',
      },
      {
        column: 'score',
        description: '배점 (선택, 기본값 1점)',
        example: '1, 2, 3, ...',
      },
    ]);

    // 주의사항 추가
    instructionSheet.addRow({});
    instructionSheet.addRow({
      column: '⚠️ 주의사항',
      description: '',
      example: '',
    });
    instructionSheet.addRow({
      column: '',
      description: '1. question_number는 1부터 순차적으로 입력하세요',
      example: '',
    });
    instructionSheet.addRow({
      column: '',
      description: '2. 객관식(mcq)은 반드시 choices와 correct_answer를 입력하세요',
      example: '',
    });
    instructionSheet.addRow({
      column: '',
      description: '3. choices는 || 로 구분하며, 최대 5개까지 입력 가능합니다',
      example: '',
    });
    instructionSheet.addRow({
      column: '',
      description: '4. correct_answer는 객관식의 경우 1-5 숫자로 입력하세요',
      example: '',
    });

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    headers.set(
      'Content-Disposition',
      'attachment; filename="exam_template.xlsx"'
    );

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
