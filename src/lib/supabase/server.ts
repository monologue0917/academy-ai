/**
 * Supabase Server Client
 * 
 * API Routes에서 사용하는 서버 사이드 Supabase 클라이언트
 * ⚠️ 이 클라이언트는 서버에서만 사용해야 합니다!
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerConfig } from '@/lib/config/env';

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * Service Role Key로 관리자 권한 사용
 */
export function createClient() {
  const config = getServerConfig();

  return createSupabaseClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 싱글톤 인스턴스 (선택적 사용)
let serverClient: ReturnType<typeof createSupabaseClient> | null = null;

export function getServerClient() {
  if (!serverClient) {
    serverClient = createClient() as any;
  }
  return serverClient;
}
