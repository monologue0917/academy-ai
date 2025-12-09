/**
 * POST /api/auth/login
 * 
 * 로그인 API
 * 
 * 요청:
 * - academyCode: 학원 코드
 * - role: teacher | student
 * - name: 이름
 * - password: 비밀번호
 * 
 * 응답:
 * - success: boolean
 * - user: AuthUser (성공 시)
 * - error: string (실패 시)
 */


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import type { LoginRequest, LoginResponse, AuthUser } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { academyCode, role, name, password } = body;

    // 입력 검증
    if (!academyCode || !role || !name || !password) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: '모든 필드를 입력해주세요',
      }, { status: 400 });
    }

    const supabase = createClient();

    // 1. 학원 코드로 학원 찾기
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('id, name, code')
      .eq('code', academyCode)
      .eq('is_active', true)
      .single();

    if (academyError || !academy) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: '존재하지 않는 학원 코드입니다',
      }, { status: 401 });
    }

    // 2. 사용자 찾기 (학원 + 역할 + 이름)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, role, password_hash')
      .eq('academy_id', academy.id)
      .eq('role', role)
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: '이름 또는 비밀번호가 일치하지 않습니다',
      }, { status: 401 });
    }

    // 3. 비밀번호 확인
    // password_hash가 없으면 초기 비밀번호 설정 필요
    if (!user.password_hash) {
      // 초기 로그인: 입력한 비밀번호로 해시 생성 후 저장
      const hash = await bcrypt.hash(password, 10);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hash })
        .eq('id', user.id);

      if (updateError) {
        console.error('Password update error:', updateError);
        return NextResponse.json<LoginResponse>({
          success: false,
          error: '비밀번호 설정 중 오류가 발생했습니다',
        }, { status: 500 });
      }
    } else {
      // 기존 비밀번호 확인
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        return NextResponse.json<LoginResponse>({
          success: false,
          error: '이름 또는 비밀번호가 일치하지 않습니다',
        }, { status: 401 });
      }
    }

    // 4. 학생인 경우 반 정보 조회
    let classes: { id: string; name: string }[] = [];
    
    if (role === 'student') {
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
          class:classes(id, name)
        `)
        .eq('student_id', user.id)
        .eq('is_active', true);

      if (enrollments) {
        classes = enrollments
          .map((e: any) => e.class)
          .filter(Boolean);
      }
    }

    // 5. 마지막 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // 6. 응답 구성
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email || undefined,
      phone: user.phone || undefined,
      academyId: academy.id,
      academyName: academy.name,
      academyCode: academy.code,
      classes: role === 'student' ? classes : undefined,
    };

    return NextResponse.json<LoginResponse>({
      success: true,
      user: authUser,
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json<LoginResponse>({
      success: false,
      error: '서버 오류가 발생했습니다',
    }, { status: 500 });
  }
}
