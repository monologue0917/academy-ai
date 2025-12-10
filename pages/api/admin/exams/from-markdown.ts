// pages/api/admin/exams/from-markdown.ts
// 마크다운 시험 라이브러리 조회 (MVP에서는 빈 배열 반환)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // MVP에서는 시험 라이브러리 기능 비활성화
  // 나중에 마크다운 파일에서 시험을 불러오는 기능 추가 예정
  return res.status(200).json({
    success: true,
    exams: [],
    message: '시험 라이브러리는 준비 중입니다',
  });
}
