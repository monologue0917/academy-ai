/**
 * Supabase Client (클라이언트용)
 * 
 * 브라우저에서 사용하는 Supabase 클라이언트
 * Anon Key만 사용 (공개 키)
 */

import { createClient } from '@supabase/supabase-js';
import { getPublicConfig } from '@/lib/config/env';

const config = getPublicConfig();

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
