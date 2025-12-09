/**
 * POST /api/auth/register
 * 
 * 회원가입 API
 * 
 * 요청:
 * - academyCode: 학원 코드
 * - role: teacher | student
 * - name: 이름
 * - password: 비밀번호
 * - email?: 이메일 (선생님 필수)
 * - phone?: 전화번호
 * 
 * 응답:
 * - success: boolean
 * - user: AuthUser (성공 시)
 * - error: string (실패 시)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import type { RegisterRequest, RegisterResponse, AuthUser } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { academyCode, role, name, password, email, phone } = body;

    // 입력 검증
    if (!academyCode || !role || !name || !password) {
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '필수 필드를 모두 입력해주세요',
      }, { status: 400 });
    }

    // 선생님은 이메일 필수
    if (role === 'teacher' && !email) {
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '선생님은 이메일이 필수입니다',
      }, { status: 400 });
    }

    // 비밀번호 길이 검증
    if (password.length < 4) {
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '비밀번호는 4자 이상이어야 합니다',
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
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '존재하지 않는 학원 코드입니다',
      }, { status: 400 });
    }

    // 2. 중복 체크 (같은 학원 + 역할 + 이름)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('academy_id', academy.id)
      .eq('role', role)
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '이미 등록된 이름입니다. 로그인을 시도해주세요.',
      }, { status: 400 });
    }

    // 3. 이메일 중복 체크 (이메일이 있는 경우)
    if (email) {
      const { data: emailExisting } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (emailExisting) {
        return NextResponse.json<RegisterResponse>({
          success: false,
          error: '이미 사용 중인 이메일입니다',
        }, { status: 400 });
      }
    }

    // 4. 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. 사용자 생성
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        academy_id: academy.id,
        name,
        role,
        email: email || null,
        phone: phone || null,
        password_hash: passwordHash,
        is_active: true,
      })
      .select('id, name, email, phone, role')
      .single();

    if (createError || !newUser) {
      console.error('User creation error:', createError);
      return NextResponse.json<RegisterResponse>({
        success: false,
        error: '회원가입 중 오류가 발생했습니다',
      }, { status: 500 });
    }

    // 6. 응답 구성
    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email || undefined,
      phone: newUser.phone || undefined,
      academyId: academy.id,
      academyName: academy.name,
      academyCode: academy.code,
      classes: [],
    };

    return NextResponse.json<RegisterResponse>({
      success: true,
      user: authUser,
    });

  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json<RegisterResponse>({
      success: false,
      error: '서버 오류가 발생했습니다',
    }, { status: 500 });
  }
}
