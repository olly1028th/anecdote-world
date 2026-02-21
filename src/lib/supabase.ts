import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Supabase 환경변수가 설정되어 있는지 여부. false이면 데모 모드로 동작 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
