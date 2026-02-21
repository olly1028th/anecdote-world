import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ProfileInput {
  nickname?: string;
  bio?: string;
  avatar_url?: string;
}

export interface UseProfileReturn {
  updating: boolean;
  error: string | null;
  updateProfile: (input: ProfileInput) => Promise<void>;
}

/**
 * 프로필 CRUD 훅.
 * Supabase 미설정(데모 모드) 시에는 실제 DB 요청을 보내지 않고 조용히 성공 처리한다.
 */
export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      setError(null);

      // 데모 모드 → noop
      if (!isSupabaseConfigured) {
        return;
      }

      if (!user) {
        setError('로그인이 필요합니다');
        return;
      }

      try {
        setUpdating(true);

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateErr) throw updateErr;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다';
        setError(message);
      } finally {
        setUpdating(false);
      }
    },
    [user],
  );

  return { updating, error, updateProfile };
}
