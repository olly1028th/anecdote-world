import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Supabase 환경변수가 설정되어 있는지 여부. false이면 데모 모드로 동작 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// 환경변수 미설정 시 더미 URL로 초기화 (실제 요청은 보내지 않음)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);
