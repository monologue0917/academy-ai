import * as XLSX from 'xlsx';
import { ExcelQuestion, QuestionType } from '@/types/exam';

/**
 * 엑셀 템플릿 생성
 */
export function createExcelTemplate(): XLSX.WorkBook {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      '번호',
      '문제유형',
      '지문',
      '문제',
      '보기1',
      '보기2',
      '보기3',
      '보기4',
      '보기5',
      '정답',
      '배점',
      '난이도',
      '태그',
    ],
    [
      1,
      'multiple_choice',
      '(지문이 있는 경우 작성)',
      '다음 중 올바른 것은?',
      'Apple',
      'Banana',
      'Cherry',
      'Date',
      'Elderberry',
      '1',
      5,
      3,
      '문법,독해',
    ],
    [
      2,
      'short_answer',
      '',
      '다음 빈칸에 알맞은 단어는?',
      '',
      '',
      '',
      '',
      '',
      'answer',
      3,
      2,
      '어휘',
    ],
  ]);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },  // 번호
    { wch: 15 }, // 문제유형
    { wch: 30 }, // 지문
    { wch: 40 }, // 문제
    { wch: 20 }, // 보기1
    { wch: 20 }, // 보기2
    { wch: 20 }, // 보기3
    { wch: 20 }, // 보기4
    { wch: 20 }, // 보기5
    { wch: 10 }, // 정답
    { wch: 8 },  // 배점
    { wch: 8 },  // 난이도
    { wch: 20 }, // 태그
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '문제');

  return workbook;
}

/**
 * 엑셀 파일 파싱
 */
export function parseExcelFile(buffer: ArrayBuffer): ExcelQuestion[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  
  if (!firstSheetName) {
    throw new Error('엑셀 파일에 시트가 없습니다');
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  if (!worksheet) {
    throw new Error('시트를 찾을 수 없습니다');
  }
  
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // 헤더 제거
  const rows = data.slice(1);

  const questions: ExcelQuestion[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    // 빈 행 스킵
    if (!row || row.length === 0 || !row[0]) return;

    try {
      const order = parseInt(String(row[0])) || index + 1;
      const type = (row[1] || 'multiple_choice') as QuestionType;
      const passage = row[2] ? String(row[2]).trim() : undefined;
      const content = String(row[3] || '').trim();
      const choices: string[] = [];

      // 객관식인 경우 보기 파싱
      if (type === 'multiple_choice') {
        for (let i = 4; i <= 8; i++) {
          if (row[i] && String(row[i]).trim()) {
            choices.push(String(row[i]).trim());
          }
        }
      }

      const correctAnswer = String(row[9] || '').trim();
      const points = parseInt(String(row[10])) || 5;
      const difficulty = Math.min(Math.max(parseInt(String(row[11])) || 3, 1), 5);
      const tags = row[12] ? String(row[12]).split(',').map(t => t.trim()) : [];

      // 유효성 검사
      if (!content) {
        errors.push(`${order}번: 문제 내용이 없습니다`);
        return;
      }

      if (!correctAnswer) {
        errors.push(`${order}번: 정답이 없습니다`);
        return;
      }

      if (type === 'multiple_choice' && choices.length === 0) {
        errors.push(`${order}번: 객관식 문제는 보기가 필요합니다`);
        return;
      }

      questions.push({
        order,
        type,
        passage,
        content,
        choices: choices.length > 0 ? choices : undefined,
        correctAnswer,
        points,
        difficulty,
        tags,
      });
    } catch (error) {
      errors.push(`${index + 1}번 행 파싱 오류: ${error}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`엑셀 파싱 오류:\n${errors.join('\n')}`);
  }

  return questions;
}

/**
 * 엑셀 파일을 Buffer로 생성
 */
export function generateExcelBuffer(workbook: XLSX.WorkBook): Buffer {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return buffer;
}
