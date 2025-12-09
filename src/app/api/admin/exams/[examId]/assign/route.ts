/**
 * POST /api/admin/exams/[examId]/assign
 * 
 * 기능: 시험을 학생들에게 배정
 * 
 * 실제 DB 스키마 (exam_assignments):
 * - id, exam_id (NOT NULL), class_id, student_id
 * - status (ENUM), start_time (NOT NULL), end_time (NOT NULL)
 * - created_at, updated_at
 * 
 * 제약조건: check_class_or_student
 * - class_id와 student_id 중 하나만 있어야 함
 * - 우리는 student_id만 사용 (개별 학생 배정)
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const supabase = createClient();
    
    // body에서 classId를 받을 수 있음 (학생 조회용)
    let classId: string | null = null;
    try {
      const body = await request.json();
      classId = body.classId || null;
    } catch {
      // body가 없을 수 있음
    }

    console.log('[Assign] examId:', examId, 'classId:', classId);

    // 1. 시험 정보 조회
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, academy_id, title, time_limit_minutes')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('[Assign] 시험 조회 실패:', examError);
      return NextResponse.json(
        { success: false, error: '시험을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log('[Assign] 시험 정보:', exam);

    // 2. 학생 목록 조회
    let students: Array<{ id: string }> = [];

    if (classId) {
      // 특정 반의 학생들
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('is_active', true);

      if (enrollError) {
        console.error('[Assign] 반 학생 조회 실패:', enrollError);
        return NextResponse.json(
          { success: false, error: '학생 목록 조회 실패' },
          { status: 500 }
        );
      }

      students = (enrollments || []).map(e => ({ id: e.student_id }));
    } else {
      // 학원의 모든 학생 (class_id가 없으면)
      const { data: allStudents, error: studentsError } = await supabase
        .from('users')
        .select('id')
        .eq('academy_id', exam.academy_id)
        .eq('role', 'student')
        .eq('is_active', true);

      if (studentsError) {
        console.error('[Assign] 학생 조회 실패:', studentsError);
        return NextResponse.json(
          { success: false, error: '학생 목록 조회 실패' },
          { status: 500 }
        );
      }

      students = allStudents || [];
    }

    console.log('[Assign] 학생 수:', students.length);

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: '배정할 학생이 없습니다' },
        { status: 400 }
      );
    }

    // 3. 이미 배정된 학생 확인
    const { data: existingAssignments } = await supabase
      .from('exam_assignments')
      .select('student_id')
      .eq('exam_id', examId);

    const existingStudentIds = new Set(
      (existingAssignments || []).map(a => a.student_id)
    );

    // 아직 배정 안 된 학생만 필터링
    const newStudents = students.filter(s => !existingStudentIds.has(s.id));

    console.log('[Assign] 새로 배정할 학생 수:', newStudents.length);

    if (newStudents.length === 0) {
      return NextResponse.json({
        success: true,
        assignedCount: 0,
        message: '이미 모든 학생에게 배정되어 있습니다',
      });
    }

    // 4. 시험 시간 설정 (시작: 지금, 종료: 7일 후)
    const now = new Date();
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후

    // 5. 배정 생성
    // 중요: check_class_or_student 제약조건 때문에 class_id와 student_id 중 하나만!
    // 여기서는 student_id만 사용 (개별 학생 배정)
    const assignments = newStudents.map((student) => ({
      exam_id: examId,
      student_id: student.id,
      // class_id는 넣지 않음! (제약조건 위반 방지)
      status: 'scheduled',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
    }));

    console.log('[Assign] 배정 데이터 샘플:', assignments[0]);

    const { data: insertedAssignments, error: assignError } = await supabase
      .from('exam_assignments')
      .insert(assignments)
      .select();

    if (assignError) {
      console.error('[Assign] 배정 생성 실패:', assignError);
      return NextResponse.json(
        { success: false, error: '배정 생성 실패', details: assignError.message },
        { status: 500 }
      );
    }

    console.log('[Assign] 배정 완료:', insertedAssignments?.length);

    return NextResponse.json({
      success: true,
      assignedCount: insertedAssignments?.length || newStudents.length,
      message: `${insertedAssignments?.length || newStudents.length}명의 학생에게 배정되었습니다`,
    });
  } catch (error) {
    console.error('[Assign] 전체 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
