/**
 * 채점 로직 (Stage G-3 Priority 3)
 * 
 * 기능:
 * 1. 객관식(MCQ) 자동 채점
 * 2. 단답형(Short Answer) 자동 채점
 * 3. 정답 비교 로직
 */

export interface GradingResult {
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
}

/**
 * 객관식 채점
 * 
 * @param studentAnswer - 학생 답안 (예: "3")
 * @param correctAnswer - 정답 (예: "3")
 * @param points - 배점
 * @returns GradingResult
 */
export function gradeMCQ(
  studentAnswer: string,
  correctAnswer: string,
  points: number
): GradingResult {
  // 공백 제거 후 비교
  const normalizedStudent = studentAnswer.trim();
  const normalizedCorrect = correctAnswer.trim();

  const isCorrect = normalizedStudent === normalizedCorrect;

  return {
    isCorrect,
    earnedPoints: isCorrect ? points : 0,
    maxPoints: points,
  };
}

/**
 * 단답형 채점
 * 
 * 규칙:
 * - 대소문자 무시
 * - 앞뒤 공백 제거
 * - 특수문자 제거 (선택)
 * 
 * @param studentAnswer - 학생 답안
 * @param correctAnswer - 정답
 * @param points - 배점
 * @param options - 채점 옵션
 * @returns GradingResult
 */
export function gradeShortAnswer(
  studentAnswer: string,
  correctAnswer: string,
  points: number,
  options?: {
    caseSensitive?: boolean; // 대소문자 구분 여부 (기본: false)
    removeSpaces?: boolean; // 공백 제거 여부 (기본: true)
    removePunctuation?: boolean; // 특수문자 제거 여부 (기본: false)
  }
): GradingResult {
  const {
    caseSensitive = false,
    removeSpaces = true,
    removePunctuation = false,
  } = options || {};

  let normalizedStudent = studentAnswer.trim();
  let normalizedCorrect = correctAnswer.trim();

  // 대소문자 무시
  if (!caseSensitive) {
    normalizedStudent = normalizedStudent.toLowerCase();
    normalizedCorrect = normalizedCorrect.toLowerCase();
  }

  // 공백 제거
  if (removeSpaces) {
    normalizedStudent = normalizedStudent.replace(/\s+/g, '');
    normalizedCorrect = normalizedCorrect.replace(/\s+/g, '');
  }

  // 특수문자 제거
  if (removePunctuation) {
    normalizedStudent = normalizedStudent.replace(/[^\w\s]/g, '');
    normalizedCorrect = normalizedCorrect.replace(/[^\w\s]/g, '');
  }

  const isCorrect = normalizedStudent === normalizedCorrect;

  return {
    isCorrect,
    earnedPoints: isCorrect ? points : 0,
    maxPoints: points,
  };
}

/**
 * 서술형 채점 (AI 채점 - 추후 구현)
 * 
 * 현재: 항상 0점 (수동 채점 필요)
 * 
 * @param studentAnswer - 학생 답안
 * @param correctAnswer - 모범 답안
 * @param points - 배점
 * @returns GradingResult
 */
export function gradeEssay(
  studentAnswer: string,
  correctAnswer: string,
  points: number
): GradingResult {
  // 서술형은 자동 채점 불가
  // AI 채점 또는 선생님 수동 채점 필요
  return {
    isCorrect: false,
    earnedPoints: 0,
    maxPoints: points,
  };
}

/**
 * 문제 유형에 따른 자동 채점
 * 
 * @param questionType - 문제 유형 ('mcq' | 'short_answer' | 'essay')
 * @param studentAnswer - 학생 답안
 * @param correctAnswer - 정답
 * @param points - 배점
 * @returns GradingResult
 */
export function gradeQuestion(
  questionType: 'mcq' | 'short_answer' | 'essay',
  studentAnswer: string,
  correctAnswer: string,
  points: number
): GradingResult {
  switch (questionType) {
    case 'mcq':
      return gradeMCQ(studentAnswer, correctAnswer, points);

    case 'short_answer':
      return gradeShortAnswer(studentAnswer, correctAnswer, points);

    case 'essay':
      return gradeEssay(studentAnswer, correctAnswer, points);

    default:
      // 알 수 없는 유형은 0점 처리
      return {
        isCorrect: false,
        earnedPoints: 0,
        maxPoints: points,
      };
  }
}

/**
 * 전체 제출 채점
 * 
 * @param answers - 학생 답안 배열
 * @param questions - 문제 배열 (정답 포함)
 * @returns 채점 결과 배열
 */
export function gradeSubmission(
  answers: Array<{ questionId: string; answer: string }>,
  questions: Array<{
    id: string;
    type: 'mcq' | 'short_answer' | 'essay';
    correct_answer: string;
    points: number;
  }>
): Array<GradingResult & { questionId: string }> {
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  return answers.map((answer) => {
    const question = questionMap.get(answer.questionId);

    if (!question) {
      // 문제를 찾을 수 없음 → 0점
      return {
        questionId: answer.questionId,
        isCorrect: false,
        earnedPoints: 0,
        maxPoints: 0,
      };
    }

    const result = gradeQuestion(
      question.type,
      answer.answer,
      question.correct_answer,
      question.points
    );

    return {
      questionId: answer.questionId,
      ...result,
    };
  });
}

/**
 * 총점 계산
 * 
 * @param gradingResults - 채점 결과 배열
 * @returns { totalScore, maxScore, percentage }
 */
export function calculateTotalScore(gradingResults: GradingResult[]) {
  const totalScore = gradingResults.reduce(
    (sum, result) => sum + result.earnedPoints,
    0
  );

  const maxScore = gradingResults.reduce(
    (sum, result) => sum + result.maxPoints,
    0
  );

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    totalScore,
    maxScore,
    percentage,
  };
}
