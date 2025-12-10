/**
 * 마크다운 시험 파일 파서
 * .md 파일에서 시험 문제를 추출
 */

export interface ParsedExamQuestion {
  questionNumber: number;
  questionText: string;      // 문제 지문 (발문)
  passage?: string;          // 영어 지문 (있는 경우)
  choices: string[];         // 선택지
  answer: number;            // 정답 (1-5)
  points: number;            // 배점
}

export interface ParsedExam {
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  startNumber: number;
  endNumber: number;
  duration: number;          // 분
  questions: ParsedExamQuestion[];
}

/**
 * 마크다운 파일 내용을 파싱하여 시험 객체로 변환
 */
export function parseExamMarkdown(markdown: string): ParsedExam {
  const lines = markdown.split('\n');
  
  // 1. 메타데이터 추출 (YAML front matter)
  const metadata = extractMetadata(markdown);
  
  // 2. 문제 추출
  const questions = extractQuestions(markdown);
  
  return {
    id: metadata.examId || 'unknown',
    title: metadata.title || '제목 없음',
    subject: metadata.subject || '영어',
    totalQuestions: metadata.totalQuestions || questions.length,
    startNumber: metadata.startNumber || 18,
    endNumber: metadata.endNumber || 45,
    duration: metadata.duration || 70,
    questions,
  };
}

/**
 * YAML front matter에서 메타데이터 추출
 */
function extractMetadata(markdown: string): Record<string, any> {
  const metadataMatch = markdown.match(/---\n([\s\S]*?)\n---/);
  if (!metadataMatch) return {};
  
  const metadataStr = metadataMatch[1];
  if (!metadataStr) return {};
  
  const metadata: Record<string, any> = {};
  
  metadataStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // 숫자로 변환 가능하면 변환
      metadata[key.trim()] = isNaN(Number(value)) ? value : Number(value);
    }
  });
  
  return metadata;
}

/**
 * 마크다운에서 문제들 추출
 */
function extractQuestions(markdown: string): ParsedExamQuestion[] {
  const questions: ParsedExamQuestion[] = [];
  
  // ## 번호 로 시작하는 문제 블록 분리
  const questionBlocks = markdown.split(/\n## (\d+)\n/).slice(1);
  
  for (let i = 0; i < questionBlocks.length; i += 2) {
    const numberStr = questionBlocks[i];
    const content = questionBlocks[i + 1];
    
    if (!numberStr || !content) continue;
    
    const questionNumber = parseInt(numberStr);
    if (isNaN(questionNumber)) continue;
    
    const question = parseQuestionBlock(questionNumber, content);
    if (question) {
      questions.push(question);
    }
  }
  
  return questions.sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * 개별 문제 블록 파싱
 */
function parseQuestionBlock(questionNumber: number, content: string): ParsedExamQuestion | null {
  try {
    // 정답과 배점 추출
    const answerMatch = content.match(/>\s*answer:\s*(\d+)/);
    const pointsMatch = content.match(/>\s*points:\s*(\d+)/);
    
    const answerStr = answerMatch?.[1];
    const pointsStr = pointsMatch?.[1];
    
    const answer = answerStr ? parseInt(answerStr) : 1;
    const points = pointsStr ? parseInt(pointsStr) : 2;
    
    // 정답/배점 라인 제거
    let cleanContent = content
      .replace(/>\s*answer:\s*\d+/g, '')
      .replace(/>\s*points:\s*\d+/g, '')
      .trim();
    
    // 선택지 추출 (1. ~ 5. 형식)
    const choicePattern = /^(\d)\.\s+(.+)$/gm;
    const choices: string[] = [];
    let match;
    
    while ((match = choicePattern.exec(cleanContent)) !== null) {
      const choiceText = match[2];
      if (choiceText) {
        choices.push(choiceText.trim());
      }
    }
    
    // 선택지 제거하여 지문 추출
    let textContent = cleanContent
      .replace(/^\d\.\s+.+$/gm, '')
      .replace(/---/g, '')
      .trim();
    
    // **문제**와 지문 분리
    const questionTextMatch = textContent.match(/\*\*(.+?)\*\*/);
    const questionText = questionTextMatch?.[1] || '';
    
    // 지문 추출 (문제 텍스트 이후의 내용)
    let passage = '';
    if (questionTextMatch) {
      const matchedText = questionTextMatch[0];
      const afterQuestion = textContent.substring(
        textContent.indexOf(matchedText) + matchedText.length
      ).trim();
      
      if (afterQuestion) {
        // 선택지 전까지가 지문
        const passageParts = afterQuestion.split(/^\d\.\s/m);
        const firstPart = passageParts[0];
        if (firstPart) {
          passage = firstPart.trim();
        }
      }
    }
    
    return {
      questionNumber,
      questionText,
      passage: passage || undefined,
      choices,
      answer,
      points,
    };
  } catch (error) {
    console.error(`문제 ${questionNumber} 파싱 실패:`, error);
    return null;
  }
}

/**
 * 파싱된 시험을 DB 삽입용 형식으로 변환
 */
export function convertToDbFormat(exam: ParsedExam) {
  return {
    examData: {
      title: exam.title,
      duration: exam.duration,
      totalPoints: exam.questions.reduce((sum, q) => sum + q.points, 0),
    },
    questions: exam.questions.map(q => ({
      questionNumber: q.questionNumber,
      type: 'mcq' as const,
      content: q.questionText,
      passage: q.passage,
      options: q.choices,
      correctAnswer: String(q.answer),
      points: q.points,
    })),
  };
}
