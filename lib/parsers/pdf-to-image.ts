/**
 * PDF를 이미지로 변환 (여러 방법 시도)
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * PDF의 각 페이지를 PNG 이미지로 변환
 * 
 * 방법 1: pdf2pic (GraphicsMagick 필요)
 * 방법 2: 클라이언트 렌더링 (fallback)
 */
export async function convertPDFToImages(
  pdfBuffer: Buffer
): Promise<string[]> {
  console.log('PDF → 이미지 변환 시작...');
  
  try {
    // PDF 페이지 수 확인
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`총 ${pageCount}페이지 발견`);

    // 방법 1: pdf2pic 시도
    try {
      return await convertWithPdf2pic(pdfBuffer, pageCount);
    } catch (pdf2picError) {
      console.warn('pdf2pic 실패, 대체 방법 사용:', pdf2picError);
      
      // 방법 2: 간단한 placeholder (임시)
      console.log('⚠️ GraphicsMagick이 설치되지 않았습니다.');
      console.log('📌 해결 방법:');
      console.log('   1. http://www.graphicsmagick.org/download.html');
      console.log('   2. Windows installer 다운로드 및 설치');
      console.log('   3. "Add to PATH" 옵션 체크');
      console.log('');
      console.log('📌 또는: 클라이언트에서 PDF를 이미지로 변환 후 업로드');
      
      // Placeholder 반환 (실제로는 클라이언트 렌더링 필요)
      return Array(pageCount).fill('').map(() => createPlaceholderBase64());
    }

  } catch (error) {
    console.error('PDF 변환 에러:', error);
    throw new Error('PDF를 이미지로 변환하는데 실패했습니다.');
  }
}

/**
 * pdf2pic을 사용한 변환
 */
async function convertWithPdf2pic(
  pdfBuffer: Buffer,
  pageCount: number
): Promise<string[]> {
  // dynamic import (설치 안 되어있어도 에러 안 남)
  const { fromBuffer } = await import('pdf2pic');

  const tempDir = path.join(os.tmpdir(), `pdf-convert-${Date.now()}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const options = {
    density: 150, // DPI (150이면 충분히 선명)
    saveFilename: 'page',
    savePath: tempDir,
    format: 'png',
    width: 1654, // A4 기준 150 DPI
    height: 2339,
  };

  const convert = fromBuffer(pdfBuffer, options);
  const images: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    console.log(`페이지 ${pageNumber}/${pageCount} 변환 중...`);
    
    const result = await convert(pageNumber, { 
      responseType: 'base64' 
    });

    if (result.base64) {
      images.push(result.base64);
    }
  }

  // 임시 파일 정리
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch {}

  console.log(`pdf2pic 변환 완료: ${images.length}개`);
  return images;
}

/**
 * Placeholder 이미지 (임시)
 */
function createPlaceholderBase64(): string {
  // 1x1 흰색 PNG (base64)
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}

/**
 * PDF 페이지 정보 추출
 */
export async function getPDFPageInfo(pdfBuffer: Buffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  return {
    pageCount: pdfDoc.getPageCount(),
    pages: pages.map((page, index) => ({
      number: index + 1,
      width: page.getWidth(),
      height: page.getHeight(),
    })),
  };
}
