/**
 * 테스트 API - Vercel 배포 디버깅용
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    },
    tests: {},
  };

  // 테스트 1: Supabase 연결
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, is_active')
      .limit(5);
    
    results.tests.supabase = {
      success: !error,
      error: error?.message,
      dataCount: data?.length || 0,
      data: data,
    };
  } catch (e: any) {
    results.tests.supabase = {
      success: false,
      error: e.message,
    };
  }

  // 테스트 2: 특정 반 조회
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    results.tests.singleClass = {
      success: !error,
      error: error?.message,
      data: data,
    };
  } catch (e: any) {
    results.tests.singleClass = {
      success: false,
      error: e.message,
    };
  }

  return NextResponse.json(results);
}
