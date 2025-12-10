/**
 * 인증 관련 타입 정의
 */

// 사용자 역할
export type UserRole = 'teacher' | 'student';

// 세션에 저장될 사용자 정보
export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  academyId: string;
  academyName: string;
  academyCode: string;
  // 학생인 경우 반 정보
  classes?: {
    id: string;
    name: string;
  }[];
}

// 로그인 요청
export interface LoginRequest {
  academyCode: string;
  role: UserRole;
  name: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// 회원가입 요청
export interface RegisterRequest {
  academyCode: string;
  role: UserRole;
  name: string;
  password: string;
  email?: string;
  phone?: string;
}

// 회원가입 응답
export interface RegisterResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// 인증 Context 상태
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 인증 Context 액션
export interface AuthContextValue extends AuthState {
  login: (request: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
}
