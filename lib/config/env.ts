/**
 * 환경변수 설정 관리
 * 
 * 모든 환경변수 접근은 이 파일을 통해서만!
 * - getServerConfig(): 서버 전용 설정 (API Routes에서만 사용)
 * - getPublicConfig(): 클라이언트에서도 접근 가능한 설정
 */

// ============================================
// 공개 설정 (클라이언트 접근 가능)
// ============================================

export interface PublicConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
}

let publicConfigCache: PublicConfig | null = null;

/**
 * 클라이언트에서도 사용 가능한 공개 설정
 * NEXT_PUBLIC_ 접두사가 붙은 환경변수만 포함
 */
export function getPublicConfig(): PublicConfig {
  if (publicConfigCache) return publicConfigCache;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  }

  publicConfigCache = {
    supabaseUrl,
    supabaseAnonKey,
    appUrl,
  };

  return publicConfigCache;
}

// ============================================
// 서버 전용 설정 (API Routes에서만!)
// ============================================

export interface ServerConfig extends PublicConfig {
  supabaseServiceKey: string;
  openaiApiKey: string;
  openaiModelText: string;
  openaiModelVision: string;
  isProduction: boolean;
}

let serverConfigCache: ServerConfig | null = null;

/**
 * 서버 전용 설정
 * ⚠️ 주의: API Routes, Server Actions에서만 사용!
 * 클라이언트 컴포넌트에서 절대 import 하지 마세요.
 */
export function getServerConfig(): ServerConfig {
  // 클라이언트에서 호출 방지
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerConfig()는 서버에서만 호출할 수 있습니다. ' +
      '클라이언트에서는 getPublicConfig()를 사용하세요.'
    );
  }

  if (serverConfigCache) return serverConfigCache;

  const publicConfig = getPublicConfig();

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  }

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  serverConfigCache = {
    ...publicConfig,
    supabaseServiceKey,
    openaiApiKey,
    openaiModelText: process.env.OPENAI_MODEL_TEXT || 'gpt-4o-mini',
    openaiModelVision: process.env.OPENAI_MODEL_VISION || 'gpt-4o',
    isProduction: process.env.NODE_ENV === 'production',
  };

  return serverConfigCache;
}

// ============================================
// 유틸리티
// ============================================

/**
 * 환경변수 유효성 검사 (빌드 타임)
 * next.config.js 또는 시작 시 호출
 */
export function validateEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `필수 환경변수가 누락되었습니다:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  console.log('✅ 환경변수 검증 완료');
}
