'use client';

/**
 * 로그인 페이지
 * 
 * 기능:
 * - 학원 코드 입력
 * - 학생/선생님 탭 선택
 * - 이름, 비밀번호 입력
 * - 로그인/회원가입 전환
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, user, isLoading } = useAuth();

  // 폼 상태
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('student');
  const [academyCode, setAcademyCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // UI 상태
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'student') {
        router.push('/app');
      } else {
        router.push('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login({
          academyCode,
          role,
          name,
          password,
        });

        if (result.success && result.user) {
          // 로그인 성공 - 역할에 따라 리다이렉트
          if (result.user.role === 'student') {
            router.push('/app');
          } else {
            router.push('/admin');
          }
        } else {
          setError(result.error || '로그인에 실패했습니다');
        }
      } else {
        // 회원가입
        const result = await register({
          academyCode,
          role,
          name,
          password,
          email: email || undefined,
          phone: phone || undefined,
        });

        if (result.success && result.user) {
          // 회원가입 성공 - 역할에 따라 리다이렉트
          if (result.user.role === 'student') {
            router.push('/app');
          } else {
            router.push('/admin');
          }
        } else {
          setError(result.error || '회원가입에 실패했습니다');
        }
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고/타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI 학원</h1>
          <p className="text-slate-500 mt-1">스마트한 영어 학습의 시작</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* 역할 선택 탭 */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                role === 'student'
                  ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              👨‍🎓 학생
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                role === 'teacher'
                  ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              👩‍🏫 선생님
            </button>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
                {error}
              </div>
            )}

            {/* 학원 코드 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                학원 코드
              </label>
              <input
                type="text"
                value={academyCode}
                onChange={(e) => setAcademyCode(e.target.value)}
                placeholder="예: 2749"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
              />
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '비밀번호' : '4자 이상'}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
                minLength={4}
              />
              {mode === 'login' && (
                <p className="mt-1 text-xs text-slate-400">
                  처음 로그인 시 입력한 비밀번호가 등록됩니다
                </p>
              )}
            </div>

            {/* 회원가입 추가 필드 */}
            {mode === 'register' && (
              <>
                {/* 이메일 (선생님 필수) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    이메일 {role === 'teacher' && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    required={role === 'teacher'}
                  />
                </div>

                {/* 전화번호 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    전화번호 (선택)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  처리 중...
                </span>
              ) : mode === 'login' ? (
                '로그인'
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          {/* 모드 전환 */}
          <div className="px-6 pb-6">
            <div className="text-center">
              {mode === 'login' ? (
                <p className="text-sm text-slate-500">
                  처음이신가요?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    회원가입
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  이미 계정이 있으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    로그인
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
