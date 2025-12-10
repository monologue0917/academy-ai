'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  PageHeader,
  AppCard,
  CardHeader,
  CardContent,
  Button,
  BackButton,
  UploadIcon,
  FileTextIcon,
  LoadingSpinner,
  Badge,
} from '@/components/ui';

// ============================================
// Types
// ============================================

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ParsedQuestion {
  questionNumber: number;
  type: 'mcq' | 'short_answer' | 'essay';
  content: string;
  passage?: string;
  choices?: string[];
  correctAnswer: string;
  points: number;
}

type UploadMode = 'excel' | 'file-parse';
type WizardStep = 'info' | 'upload' | 'preview';

// ============================================
// Main Component
// ============================================

export default function NewExamPage() {
  const router = useRouter();
  const { user } = useAuth();

  // -----------------------------------------
  // State
  // -----------------------------------------
  
  // Step 관리
  const [step, setStep] = useState<WizardStep>('info');
  
  // 기본 정보
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(70);
  
  // 반 목록
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  
  // 업로드 방식
  const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
  
  // 엑셀 모드
  const [excelFile, setExcelFile] = useState<File | null>(null);
  
  // 파일 파싱 모드
  const [parseFile, setParseFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  
  // 공통
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // -----------------------------------------
  // Effects
  // -----------------------------------------
  
  // 반 목록 로드
  useEffect(() => {
    if (user?.academyId) {
      fetchClasses();
    }
  }, [user?.academyId]);

  const fetchClasses = async () => {
    if (!user?.academyId) return;
    
    try {
      setIsLoadingClasses(true);
      const response = await fetch(`/api/admin/classes?academyId=${user.academyId}`);
      const data = await response.json();
      
      if (data.success) {
        setClasses(data.classes || []);
        // 첫 번째 반 자동 선택
        if (data.classes?.length > 0) {
          setClassId(data.classes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // -----------------------------------------
  // Handlers
  // -----------------------------------------
  
  // 기본 정보 유효성 검사
  const validateBasicInfo = (): boolean => {
    if (!title.trim()) {
      setError('시험 제목을 입력해주세요');
      return false;
    }
    if (!classId) {
      setError('반을 선택해주세요');
      return false;
    }
    if (!scheduledAt) {
      setError('시험 일시를 선택해주세요');
      return false;
    }
    if (durationMinutes < 1) {
      setError('제한 시간은 1분 이상이어야 합니다');
      return false;
    }
    setError('');
    return true;
  };

  // 다음 단계로 이동
  const handleNextStep = () => {
    if (step === 'info') {
      if (validateBasicInfo()) {
        setStep('upload');
      }
    }
  };

  // 엑셀 템플릿 다운로드
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/exams/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exam_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError('템플릿 다운로드 실패');
    }
  };

  // 엑셀 파일 선택
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다');
        return;
      }
      setExcelFile(file);
      setError('');
    }
  };

  // 엑셀로 시험 생성
  const handleExcelSubmit = async () => {
    if (!excelFile) {
      setError('엑셀 파일을 선택해주세요');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('examData', JSON.stringify({
        title,
        classId,
        scheduledAt,
        durationMinutes,
      }));

      const response = await fetch('/api/admin/exams/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push(`/admin/exams/${result.examId}`);
      } else {
        setError(result.error || '시험 생성 실패');
        if (result.details) {
          console.error('Details:', result.details);
        }
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // PDF/이미지 파일 선택 및 파싱
  const handleParseFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setError('PDF 또는 이미지 파일만 업로드 가능합니다');
      return;
    }

    setParseFile(file);
    setError('');
    setParsedQuestions([]);

    if (isPdf) {
      await handlePdfParse(file);
    } else {
      await handleImageParse(file);
    }
  };

  // PDF 파싱 (클라이언트 렌더링 + Vision API)
  const handlePdfParse = async (pdfFile: File) => {
    setIsParsing(true);
    setParseProgress('PDF.js 로딩 중...');

    try {
      // PDF.js 동적 로드
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

      setParseProgress('PDF 파일 읽는 중...');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const pageCount = pdf.numPages;
      setParseProgress(`총 ${pageCount}페이지 렌더링 중...`);

      // 처음 3페이지만 렌더링 (빠른 테스트)
      const images: string[] = [];
      const pagesToRender = Math.min(pageCount, 3);

      for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
        setParseProgress(`페이지 ${pageNum}/${pagesToRender} 렌더링 중...`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await page.render({ 
            canvas: canvas,
            canvasContext: context, 
            viewport 
          }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          const imageBase64 = dataUrl.split(',')[1];
          if (imageBase64) {
            images.push(imageBase64);
          }
        }
      }

      if (images.length === 0) {
        throw new Error('이미지 렌더링 실패');
      }

      // Vision API 호출
      setParseProgress('AI가 문제를 추출하는 중...');
      await uploadAndParseImages(pdfFile, images);

    } catch (err: any) {
      console.error('PDF parse error:', err);
      setError(`PDF 파싱 실패: ${err.message}`);
    } finally {
      setIsParsing(false);
      setParseProgress('');
    }
  };

  // 이미지 파싱
  const handleImageParse = async (imageFile: File) => {
    setIsParsing(true);
    setParseProgress('이미지 처리 중...');

    try {
      // 이미지를 Base64로 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          if (base64Data) {
            resolve(base64Data);
          } else {
            reject(new Error('Base64 변환 실패'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      setParseProgress('AI가 문제를 추출하는 중...');
      await uploadAndParseImages(imageFile, [base64]);

    } catch (err: any) {
      console.error('Image parse error:', err);
      setError(`이미지 파싱 실패: ${err.message}`);
    } finally {
      setIsParsing(false);
      setParseProgress('');
    }
  };

  // Vision API 호출
  const uploadAndParseImages = async (file: File, images: string[]) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('subject', '영어');
      const dateValue = scheduledAt.split('T')[0] || new Date().toISOString().split('T')[0] || '';
      formData.append('date', dateValue);
      formData.append('images', JSON.stringify(images));

      const response = await fetch('/api/admin/exams/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const questions = (result.data.exam.questions || []).map((q: any, idx: number) => ({
          questionNumber: q.questionNumber || idx + 1,
          type: q.type || 'mcq',
          content: q.content || q.questionText || '',
          passage: q.passage,
          choices: q.choices,
          correctAnswer: q.correctAnswer || '',
          points: q.points || 1,
        }));

        setParsedQuestions(questions);
        
        if (questions.length > 0) {
          setStep('preview');
        } else {
          setError('문제를 찾지 못했습니다. 다른 파일을 시도해주세요.');
        }
      } else {
        setError(result.error || '파싱 실패');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  // 문제 JSON으로 시험 생성 (PDF/이미지 모드)
  const handleCreateFromJson = async () => {
    if (parsedQuestions.length === 0) {
      setError('생성할 문제가 없습니다');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/exams/create-from-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examInfo: {
            title,
            classId,
            scheduledAt,
            durationMinutes,
          },
          questions: parsedQuestions.map((q) => ({
            questionNumber: q.questionNumber,
            type: q.type,
            content: q.content,
            passage: q.passage,
            choices: q.choices,
            correctAnswer: q.correctAnswer || '1', // 기본값
            points: q.points,
          })),
          autoAssign: false,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push(`/admin/exams/${result.examId}`);
      } else {
        setError(result.error || '시험 생성 실패');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 문제 수정 (간단한 인라인 수정)
  const handleQuestionChange = (
    index: number, 
    field: keyof ParsedQuestion, 
    value: any
  ) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as ParsedQuestion;
      return updated;
    });
  };

  // -----------------------------------------
  // Render
  // -----------------------------------------
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="새 모의고사 만들기"
        description="엑셀 또는 PDF/이미지로 문제를 업로드하세요"
        backButton={<BackButton href="/admin/exams" />}
      />

      {/* 진행 단계 표시 */}
      <StepIndicator 
        currentStep={step} 
        uploadMode={uploadMode}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* STEP 1: 기본 정보 입력 */}
      {step === 'info' && (
        <AppCard>
          <CardHeader
            title="1단계: 기본 정보"
            subtitle="시험의 기본 정보를 입력하세요"
          />
          <CardContent>
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  시험 제목 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026 수능 영어 모의고사"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 반 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  대상 반 *
                </label>
                {isLoadingClasses ? (
                  <div className="flex items-center gap-2 py-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-slate-500">반 목록 로딩 중...</span>
                  </div>
                ) : classes.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">
                    등록된 반이 없습니다. 먼저 반을 생성해주세요.
                  </p>
                ) : (
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount}명)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 시험 일시 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  시험 일시 *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 제한 시간 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  제한 시간 (분) *
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={1}
                  max={300}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <Button fullWidth onClick={handleNextStep}>
                다음 단계
              </Button>
            </div>
          </CardContent>
        </AppCard>
      )}

      {/* STEP 2: 업로드 방식 선택 */}
      {step === 'upload' && (
        <>
          {/* 방식 선택 탭 */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setUploadMode('excel')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                uploadMode === 'excel'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 엑셀로 만들기
            </button>
            <button
              onClick={() => setUploadMode('file-parse')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                uploadMode === 'file-parse'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 PDF/이미지로 만들기
              <Badge variant="info" className="ml-2">Beta</Badge>
            </button>
          </div>

          {/* 엑셀 모드 */}
          {uploadMode === 'excel' && (
            <AppCard>
              <CardHeader
                title="엑셀 파일 업로드"
                subtitle="템플릿을 다운로드하여 문제를 입력하세요"
              />
              <CardContent>
                <div className="space-y-4">
                  {/* 템플릿 다운로드 */}
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-indigo-900">
                          1. 템플릿 다운로드
                        </p>
                        <p className="text-sm text-indigo-700 mt-1">
                          양식에 맞춰 문제를 입력하세요
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={handleDownloadTemplate}
                      >
                        다운로드
                      </Button>
                    </div>
                  </div>

                  {/* 파일 업로드 */}
                  <div>
                    <p className="font-medium text-slate-900 mb-2">
                      2. 작성한 파일 업로드
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelFileSelect}
                        className="hidden"
                      />
                      <div className={`
                        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                        ${excelFile 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                        }
                      `}>
                        {excelFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileTextIcon size={24} className="text-green-600" />
                            <span className="font-medium text-green-700">
                              {excelFile.name}
                            </span>
                          </div>
                        ) : (
                          <>
                            <UploadIcon size={32} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600">
                              클릭하여 엑셀 파일 선택
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="secondary" 
                      fullWidth
                      onClick={() => setStep('info')}
                    >
                      이전
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleExcelSubmit}
                      disabled={!excelFile || isSubmitting}
                    >
                      {isSubmitting ? '생성 중...' : '시험 생성'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </AppCard>
          )}

          {/* 파일 파싱 모드 */}
          {uploadMode === 'file-parse' && (
            <AppCard>
              <CardHeader
                title="PDF/이미지 업로드"
                subtitle="AI가 자동으로 문제를 추출합니다"
              />
              <CardContent>
                <div className="space-y-4">
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleParseFileSelect}
                      disabled={isParsing || isUploading}
                      className="hidden"
                    />
                    <div className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                      ${isParsing || isUploading
                        ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                        : parseFile
                          ? 'border-green-400 bg-green-50'
                          : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                      }
                    `}>
                      {isParsing || isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <LoadingSpinner size="lg" />
                          <p className="font-medium text-slate-900">
                            {parseProgress}
                          </p>
                          <p className="text-sm text-slate-500">
                            처음 3페이지를 처리합니다
                          </p>
                        </div>
                      ) : parseFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileTextIcon size={24} className="text-green-600" />
                          <span className="font-medium text-green-700">
                            {parseFile.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UploadIcon size={32} className="text-indigo-600" />
                          </div>
                          <p className="font-medium text-slate-900 mb-1">
                            PDF 또는 이미지 파일 선택
                          </p>
                          <p className="text-sm text-slate-500">
                            AI가 자동으로 문제를 추출합니다
                          </p>
                        </>
                      )}
                    </div>
                  </label>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      💡 <strong>빠른 테스트</strong>를 위해 처음 3페이지만 처리합니다.
                      정답이 포함된 페이지가 앞쪽에 있어야 합니다.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setStep('info')}
                  >
                    이전
                  </Button>
                </div>
              </CardContent>
            </AppCard>
          )}
        </>
      )}

      {/* STEP 3: 문제 미리보기 (파일 파싱 모드) */}
      {step === 'preview' && (
        <>
          {/* 파일 정보 */}
          <AppCard>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileTextIcon size={20} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{parseFile?.name}</p>
                  <p className="text-sm text-slate-500">
                    {parsedQuestions.length}개 문제 인식
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParseFile(null);
                    setParsedQuestions([]);
                    setStep('upload');
                  }}
                >
                  다시 업로드
                </Button>
              </div>
            </CardContent>
          </AppCard>

          {/* 문제 목록 */}
          <AppCard>
            <CardHeader
              title="AI 추출 결과"
              subtitle="필요시 내용을 수정하세요"
            />
            <CardContent>
              {parsedQuestions.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {parsedQuestions.map((q, idx) => (
                    <QuestionPreviewCard
                      key={idx}
                      question={q}
                      index={idx}
                      onChange={handleQuestionChange}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  문제를 찾지 못했습니다
                </p>
              )}
            </CardContent>
          </AppCard>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setStep('upload')}
            >
              이전
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreateFromJson}
              disabled={parsedQuestions.length === 0 || isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '이 문제들로 시험 생성'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function StepIndicator({ 
  currentStep, 
  uploadMode 
}: { 
  currentStep: WizardStep; 
  uploadMode: UploadMode;
}) {
  const steps = [
    { key: 'info', label: '기본 정보' },
    { key: 'upload', label: '파일 업로드' },
    ...(uploadMode === 'file-parse' ? [{ key: 'preview', label: '미리보기' }] : []),
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              idx <= currentIndex
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {idx + 1}
          </div>
          <span
            className={`text-sm ${
              idx <= currentIndex ? 'text-slate-900' : 'text-slate-500'
            }`}
          >
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <div className="w-8 h-0.5 bg-slate-200 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionPreviewCard({
  question,
  index,
  onChange,
}: {
  question: ParsedQuestion;
  index: number;
  onChange: (index: number, field: keyof ParsedQuestion, value: any) => void;
}) {
  const typeLabels: Record<string, string> = {
    mcq: '객관식',
    short_answer: '단답형',
    essay: '서술형',
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-600">
            {question.questionNumber}.
          </span>
          <Badge variant="info">{typeLabels[question.type] || question.type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">배점:</span>
          <input
            type="number"
            value={question.points}
            onChange={(e) => onChange(index, 'points', Number(e.target.value))}
            min={1}
            max={10}
            className="w-14 px-2 py-1 text-sm border border-slate-300 rounded"
          />
        </div>
      </div>

      {/* 지문 */}
      {question.passage && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">지문:</p>
          <p className="text-sm text-slate-700 line-clamp-3">{question.passage}</p>
        </div>
      )}

      {/* 문제 내용 */}
      <div className="mb-3">
        <textarea
          value={question.content}
          onChange={(e) => onChange(index, 'content', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none"
        />
      </div>

      {/* 보기 (객관식) */}
      {question.type === 'mcq' && question.choices && question.choices.length > 0 && (
        <div className="space-y-1.5">
          {question.choices.map((choice, cidx) => (
            <div key={cidx} className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">
                {['①', '②', '③', '④', '⑤'][cidx]}
              </span>
              <span className="text-slate-700">{choice}</span>
            </div>
          ))}
        </div>
      )}

      {/* 정답 */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">정답:</span>
          <input
            type="text"
            value={question.correctAnswer}
            onChange={(e) => onChange(index, 'correctAnswer', e.target.value)}
            placeholder={question.type === 'mcq' ? '1~5' : '정답 입력'}
            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded"
          />
        </div>
      </div>
    </div>
  );
}
