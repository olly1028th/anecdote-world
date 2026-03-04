import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncLocalDataToSupabase } from '../lib/syncLocal';
import type { Profile } from '../types/database';

// ---- 타입 ----

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Supabase 미설정 시 true → 샘플 데이터 사용 */
  isDemo: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ---- 데모 유저 (Supabase 미설정 시) ----

export const DEMO_USER_ID = 'demo-user-001';

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  email: 'demo@anecdote.world',
  app_metadata: {},
  user_metadata: { full_name: '여행자' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  nickname: '여행자',
  avatar_url: '',
  bio: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---- Context ----

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isDemo = !isSupabaseConfigured;

  // 데모 모드: 초기값으로 바로 세팅 (useEffect 내 setState 방지)
  const [user, setUser] = useState<User | null>(isDemo ? DEMO_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(isDemo ? DEMO_PROFILE : null);
  const [loading, setLoading] = useState(!isDemo);

  // 프로필 조회
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }, []);

  useEffect(() => {
    if (isDemo) return;

    // Supabase 세션 복원
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        // 로컬 전용 데이터를 Supabase에 비동기 동기화
        syncLocalDataToSupabase().catch(() => {});
      }
      setLoading(false);
    });

    // 인증 상태 변화 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        // 로그인 시 로컬 전용 데이터 동기화
        syncLocalDataToSupabase().catch(() => {});
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemo, fetchProfile]);

  // ---- 소셜 로그인 ----

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithKakao = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemo,
        signInWithGoogle,
        signInWithKakao,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
