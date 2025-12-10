'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 오답노트 페이지 + AI 해설 (v3 - 새 JSON 구조)
 */

interface AIExplanation {
  correct_reason: string[];
  wrong_reason: string[];
  key_points: string[];
  next_time_tips: string[];
  uncertainty_note: string;
}

interface WrongNote {
  id: string;
  questionId: string;
  studentAnswer: string | null;
  wrongCount: number;
  firstWrongAt: string;
  lastWrongAt: string;
  lastCorrectAt: string | null;
  reviewPriority: number;
  notes: string | null;
  question: {
    id: string;
    type: string;
    content: string;
    choices: string[];
    correctAnswer: string;
    explanation: string | null;
    difficulty: number | null;
    tags: string[];
  } | null;
}

export default function WrongNotesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'high' | 'recent'>('all');

  // AI 해설 상태
  const [aiExplanations, setAiExplanations] = useState<Record<string, AIExplanation>>({});
  const [loadingAI, setLoadingAI] = useState<Set<string>>(new Set());
  const [aiFromCache, setAiFromCache] = useState<Record<string, boolean>>({});
  const [aiResponseTime, setAiResponseTime] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.id) {
      fetchWrongNotes();
    }
  }, [user?.id]);

  const fetchWrongNotes = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/student/wrong-notes?studentId=${user.id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setWrongNotes(data.wrongNotes || []);
      } else {
        setError(data.error || '오답 목록을 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('[WrongNotes] Error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNote = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  // AI 해설 요청
  const requestAIExplanation = async (
    questionId: string,
    studentAnswer: string,
    correctAnswer: string
  ) => {
    if (aiExplanations[questionId]) return;

    setLoadingAI(prev => new Set(prev).add(questionId));

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          studentAnswer,
          correctAnswer,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setAiExplanations(prev => ({
          ...prev,
          [questionId]: result.explanation,
        }));
        setAiFromCache(prev => ({
          ...prev,
          [questionId]: result.fromCache || false,
        }));
        if (result.responseTime) {
          setAiResponseTime(prev => ({
            ...prev,
            [questionId]: result.responseTime,
          }));
        }
      } else {
        alert(result.error || 'AI 해설 생성에 실패했습니다');
      }
    } catch (err) {
      console.error('[AI Explain] Error:', err);
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoadingAI(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  // 필터링
  const filteredNotes = wrongNotes.filter(note => {
    if (filter === 'high') return note.wrongCount >= 2;
    if (filter === 'recent') {
      const lastWrong = new Date(note.lastWrongAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return lastWrong >= threeDaysAgo;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">오답 목록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">📝 오답노트</h1>
        <p className="text-sm text-slate-600">틀린 문제를 복습하고 실력을 키워보세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white">
        <div className="text-center">
          <p className="text-sm opacity-90 mb-1">총 오답 문제</p>
          <p className="text-4xl font-bold">{wrongNotes.length}개</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-sm opacity-90">2회 이상 틀림</p>
            <p className="text-xl font-semibold">
              {wrongNotes.filter(n => n.wrongCount >= 2).length}개
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm opacity-90">최근 3일</p>
            <p className="text-xl font-semibold">
              {wrongNotes.filter(n => {
                const lastWrong = new Date(n.lastWrongAt);
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                return lastWrong >= threeDaysAgo;
              }).length}개
            </p>
          </div>
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          전체 ({wrongNotes.length})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
            filter === 'high'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          자주 틀림
        </button>
        <button
          onClick={() => setFilter('recent')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
            filter === 'recent'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          최근
        </button>
      </div>

      {/* 오답 목록 */}
      {error ? (
        <div className="text-center py-8">
          <p className="text-rose-600">{error}</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {filter === 'all' ? '오답이 없습니다!' : '해당 조건의 오답이 없습니다'}
          </h3>
          <p className="text-slate-600">
            {filter === 'all'
              ? '시험을 보고 틀린 문제가 여기에 저장됩니다'
              : '다른 필터를 선택해보세요'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <WrongNoteCard
              key={note.id}
              note={note}
              isExpanded={expandedNotes.has(note.id)}
              onToggle={() => toggleNote(note.id)}
              aiExplanation={aiExplanations[note.questionId]}
              isLoadingAI={loadingAI.has(note.questionId)}
              fromCache={aiFromCache[note.questionId]}
              responseTime={aiResponseTime[note.questionId]}
              onRequestAI={() =>
                requestAIExplanation(
                  note.questionId,
                  note.studentAnswer || '?',
                  note.question?.correctAnswer || ''
                )
              }
            />
          ))}
        </div>
      )}

      {/* 복습 시작 버튼 */}
      {filteredNotes.length > 0 && (
        <Button
          variant="primary"
          onClick={() => alert('복습 기능은 곧 추가됩니다!')}
          fullWidth
        >
          🔄 복습 시작하기 ({Math.min(filteredNotes.length, 10)}문제)
        </Button>
      )}
    </div>
  );
}

// ============================================
// WrongNoteCard 컴포넌트
// ============================================

function WrongNoteCard({
  note,
  isExpanded,
  onToggle,
  aiExplanation,
  isLoadingAI,
  fromCache,
  responseTime,
  onRequestAI,
}: {
  note: WrongNote;
  isExpanded: boolean;
  onToggle: () => void;
  aiExplanation?: AIExplanation;
  isLoadingAI: boolean;
  fromCache?: boolean;
  responseTime?: number;
  onRequestAI: () => void;
}) {
  const [showAI, setShowAI] = useState(false);
  const question = note.question;

  if (!question) return null;

  const handleAIClick = () => {
    if (!aiExplanation && !isLoadingAI) {
      onRequestAI();
    }
    setShowAI(!showAI);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-rose-200">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-slate-900 font-medium line-clamp-2">{question.content}</p>
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {question.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 ml-3">
          <Badge variant="danger">{note.wrongCount}회 오답</Badge>
          <span className="text-xs text-slate-500">{formatDate(note.lastWrongAt)}</span>
        </div>
      </div>

      {/* 답안 비교 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-rose-50 rounded-lg">
          <p className="text-xs text-rose-600 mb-1">내가 고른 답</p>
          <p className="text-sm font-medium text-rose-700">
            {note.studentAnswer ? `${note.studentAnswer}번` : '(기록 없음)'}
          </p>
        </div>
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">정답</p>
          <p className="text-sm font-medium text-green-700">{question.correctAnswer}번</p>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2">
        <button
          onClick={onToggle}
          className="flex-1 py-2 text-sm text-slate-600 font-medium hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          {isExpanded ? '닫기 ▲' : '📖 선택지/해설'}
        </button>

        <button
          onClick={handleAIClick}
          disabled={isLoadingAI}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            showAI
              ? 'bg-purple-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
          } disabled:opacity-50`}
        >
          {isLoadingAI ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              분석 중...
            </span>
          ) : showAI ? (
            'AI 닫기 ▲'
          ) : (
            '🤖 AI 해설'
          )}
        </button>
      </div>

      {/* 기본 해설/선택지 */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {question.choices && question.choices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">선택지</p>
              {question.choices.map((choice, i) => {
                const num = i + 1;
                const isCorrect = String(num) === question.correctAnswer;
                const isStudentChoice = String(num) === note.studentAnswer;

                return (
                  <div
                    key={i}
                    className={`p-2 rounded-lg text-sm ${
                      isCorrect
                        ? 'bg-green-100 text-green-800 font-medium'
                        : isStudentChoice
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {num}. {choice}
                    {isCorrect && ' ✓'}
                    {isStudentChoice && !isCorrect && ' ✗'}
                  </div>
                );
              })}
            </div>
          )}

          {question.explanation && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1 font-medium">해설</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {question.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI 해설 (새 JSON 구조) */}
      {showAI && (
        <div className="mt-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-purple-700">AI 선생님</span>
            </div>
            <div className="flex items-center gap-2">
              {fromCache && (
                <span className="text-xs text-purple-400 bg-purple-100 px-2 py-0.5 rounded">
                  캐시
                </span>
              )}
              {responseTime && (
                <span className="text-xs text-purple-400">
                  {(responseTime / 1000).toFixed(1)}초
                </span>
              )}
            </div>
          </div>

          {isLoadingAI ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p className="text-sm text-purple-600">GPT-4o-mini가 분석 중...</p>
              </div>
            </div>
          ) : aiExplanation ? (
            <AIExplanationUI explanation={aiExplanation} />
          ) : (
            <p className="text-sm text-purple-600">AI 해설을 불러오는 중...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// AI 해설 UI 컴포넌트 (새 JSON 구조)
// ============================================

function AIExplanationUI({ explanation }: { explanation: AIExplanation }) {
  return (
    <div className="space-y-4">
      {/* 정답인 이유 */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-sm font-semibold text-green-700 mb-2">✅ 정답인 이유</h4>
        <ul className="space-y-1">
          {explanation.correct_reason.map((reason, i) => (
            <li key={i} className="text-sm text-green-800 leading-relaxed">
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* 왜 틀렸을까 */}
      <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
        <h4 className="text-sm font-semibold text-rose-700 mb-2">❌ 왜 틀렸을까?</h4>
        <ul className="space-y-1">
          {explanation.wrong_reason.map((reason, i) => (
            <li key={i} className="text-sm text-rose-800 leading-relaxed">
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* 핵심 포인트 */}
      {explanation.key_points && explanation.key_points.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-semibold text-amber-700 mb-2">💡 핵심 포인트</h4>
          <ul className="space-y-1">
            {explanation.key_points.map((point, i) => (
              <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 다음엔 이렇게 */}
      {explanation.next_time_tips && explanation.next_time_tips.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-700 mb-2">🚀 다음엔 이렇게!</h4>
          <ul className="space-y-1">
            {explanation.next_time_tips.map((tip, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-500 mt-1">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 불확실 노트 */}
      {explanation.uncertainty_note && explanation.uncertainty_note.length > 0 && (
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
          <h4 className="text-sm font-semibold text-slate-600 mb-1">⚠️ 참고</h4>
          <p className="text-sm text-slate-600">{explanation.uncertainty_note}</p>
        </div>
      )}
    </div>
  );
}
