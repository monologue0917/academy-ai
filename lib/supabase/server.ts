/**
 * Supabase Server Client
 * 
 * API Routes에서 사용하는 서버 사이드 Supabase 클라이언트
 * ⚠️ 이 클라이언트는 서버에서만 사용해야 합니다!
 * 
 * NOTE: Supabase 읽기 복제본 캐싱 문제를 우회하기 위해
 * 매 요청마다 새 클라이언트를 생성하고 캐시 무효화 헤더 사용
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerConfig } from '@/lib/config/env';

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * Service Role Key로 관리자 권한 사용
 */
export function createClient() {
  const config = getServerConfig();
  
  // 캐시 버스팅을 위한 타임스탬프
  const cacheBuster = Date.now();

  return createSupabaseClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'x-cache-buster': cacheBuster.toString(),
      },
    },
  });
}

// 싱글톤 사용 금지 - 항상 새 클라이언트 생성
// 캐싱 문제로 인해 싱글톤 패턴 제거
