/**
 * GET /api/student/wrong-notes
 * 
 * 학생의 오답 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type WrongNoteItem } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '학생 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 오답 목록 조회
    const { data: wrongNotes, error: notesError } = await supabase
      .from('wrong_notes')
      .select('*')
      .eq('student_id', studentId)
      .order('last_wrong_at', { ascending: false });

    if (notesError) {
      console.error('[WrongNotes] 오답 조회 실패:', notesError);
      return NextResponse.json(
        { success: false, error: '오답 조회 실패' },
        { status: 500 }
      );
    }

    if (!wrongNotes || wrongNotes.length === 0) {
      return NextResponse.json({
        success: true,
        wrongNotes: [],
        totalCount: 0,
      });
    }

    // 문제 정보 조회
    const questionIds = wrongNotes.map(n => n.question_id);

    const { data: questions } = await supabase
      .from('questions')
      .select('id, type, content, choices, correct_answer, explanation, difficulty_level, tags')
      .in('id', questionIds);

    const questionMap = new Map(
      (questions || []).map(q => [q.id, q])
    );

    // 결과 구성
    const result: WrongNoteItem[] = wrongNotes.map(note => {
      const question = questionMap.get(note.question_id);

      return {
        id: note.id,
        questionId: note.question_id,
        studentAnswer: note.student_answer || null,
        wrongCount: note.wrong_count || note.times_wrong || 1,
        firstWrongAt: note.first_wrong_at,
        lastWrongAt: note.last_wrong_at,
        lastCorrectAt: note.last_correct_at,
        reviewPriority: note.review_priority || 1,
        notes: note.notes,
        question: question ? {
          id: question.id,
          type: question.type,
          content: question.content,
          choices: question.choices || [],
          correctAnswer: question.correct_answer,
          explanation: question.explanation,
          difficulty: question.difficulty_level,
          tags: question.tags || [],
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      wrongNotes: result,
      totalCount: result.length,
    });
  } catch (error) {
    console.error('[WrongNotes] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
