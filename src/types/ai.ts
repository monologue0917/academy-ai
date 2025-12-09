/**
 * AI 해설 타입 정의
 */

export interface AIExplanation {
  correct_reason: string[];    // 정답인 이유 (2~3문장)
  wrong_reason: string[];      // 오답인 이유 (1~2문장)
  key_points: string[];        // 핵심 포인트 (2개)
  next_time_tips: string[];    // 다음에 적용할 팁 (2개)
  uncertainty_note: string;    // 불확실한 부분 (없으면 빈 문자열)
}
