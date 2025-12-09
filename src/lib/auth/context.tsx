'use client';

/**
 * 인증 Context
 * 
 * 기능:
 * - 로그인/로그아웃 상태 관리
 * - localStorage에 세션 저장
 * - 전역에서 사용자 정보 접근
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  AuthUser, 
  AuthState, 
  AuthContextValue, 
  LoginRequest, 
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from './types';

const STORAGE_KEY = 'academy_auth';

// 기본값
const defaultState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

// Context 생성
const AuthContext = createContext<AuthContextValue | null>(null);

// Provider 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  // 초기 로드: localStorage에서 세션 복원
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setState({ ...defaultState, isLoading: false });
      }
    } else {
      setState({ ...defaultState, isLoading: false });
    }
  }, []);

  // 로그인
  const login = useCallback(async (request: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }

      return data;
    } catch (error) {
      return { success: false, error: '서버 연결에 실패했습니다' };
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  // 회원가입
  const register = useCallback(async (request: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data: RegisterResponse = await response.json();

      if (data.success && data.user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }

      return data;
    } catch (error) {
      return { success: false, error: '서버 연결에 실패했습니다' };
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 편의 Hook: 로그인 필수 페이지에서 사용
export function useRequireAuth(redirectTo: string = '/login') {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [auth.isLoading, auth.isAuthenticated, redirectTo]);

  return auth;
}

// 편의 Hook: 역할별 접근 제어
export function useRequireRole(allowedRoles: ('teacher' | 'student')[], redirectTo: string = '/login') {
  const auth = useRequireAuth(redirectTo);

  useEffect(() => {
    if (!auth.isLoading && auth.user && !allowedRoles.includes(auth.user.role)) {
      // 권한 없음 - 적절한 페이지로 리다이렉트
      if (auth.user.role === 'student') {
        window.location.href = '/app';
      } else {
        window.location.href = '/admin';
      }
    }
  }, [auth.isLoading, auth.user, allowedRoles]);

  return auth;
}
