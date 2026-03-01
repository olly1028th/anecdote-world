import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalPins } from '../lib/localStore';
import { samplePins } from '../utils/sampleData';
import type { Pin } from '../types/database';

// 기존 API 호환을 위한 re-export (localStore.ts 에서 관리)
export { addLocalPin as addDemoPin } from '../lib/localStore';

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPins([...getLocalPins(), ...samplePins]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 현재 로그인한 사용자 확인
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      if (!userId) {
        // 미로그인 → 데모 데이터로 fallback
        setPins([...getLocalPins(), ...samplePins]);
        setLoading(false);
        return;
      }

      // 1) 내 핀 조회 (user_id 필터)
      const { data: myPinsData, error: err } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      const myPins = (myPinsData as Pin[]) ?? [];

      // 2) 공유받은 여행의 핀 조회
      let sharedPins: Pin[] = [];
      if (userEmail) {
        const { data: shares } = await supabase
          .from('trip_shares')
          .select('trip_id')
          .eq('status', 'accepted')
          .or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`);
        const sharedTripIds = (shares ?? []).map((s: { trip_id: string }) => s.trip_id);
        if (sharedTripIds.length > 0) {
          const { data } = await supabase
            .from('pins')
            .select('*')
            .in('trip_id', sharedTripIds)
            .order('created_at', { ascending: false });
          sharedPins = (data as Pin[]) ?? [];
        }
      }

      // 3) 병합 (중복 제거)
      const myPinIds = new Set(myPins.map((p) => p.id));
      const extraShared = sharedPins.filter((p) => !myPinIds.has(p.id));
      const dbPins = [...myPins, ...extraShared];

      // Supabase 성공 시에도 로컬 데모 핀 포함 (Supabase INSERT 실패 시 fallback으로 저장된 핀)
      // samplePins는 제외하고 사용자가 직접 추가한 로컬 핀만 병합
      const dbIds = new Set(dbPins.map((p) => p.id));
      const extraLocal = getLocalPins().filter((p) => !dbIds.has(p.id));
      setPins([...dbPins, ...extraLocal]);
    } catch (err) {
      // Supabase 실패 시 데모 데이터로 fallback
      setPins([...getLocalPins(), ...samplePins]);
      const msg = err instanceof Error ? err.message : '핀 데이터를 불러올 수 없습니다';
      setError(`서버 연결 실패: ${msg}`);
      console.error('[usePins] Supabase fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  // 핀 추가 시 자동 refetch
  useEffect(() => {
    const handler = () => fetchPins();
    window.addEventListener('pin-added', handler);
    return () => window.removeEventListener('pin-added', handler);
  }, [fetchPins]);

  return { pins, loading, error, refetch: fetchPins };
}

// ---- Pin Mutations ----

export interface PinInput {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  country?: string;
  city?: string;
  visit_status: 'visited' | 'planned' | 'wishlist';
  visited_at?: string | null;
  category?: string;
  rating?: number | null;
  note?: string;
  trip_id?: string | null;
  day_number?: number | null;
}

export async function createPin(input: PinInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  const { data, error } = await supabase
    .from('pins')
    .insert({ ...input, user_id: user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updatePin(id: string, input: Partial<PinInput>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  const { error } = await supabase.from('pins').update(input).eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function deletePin(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  const { error } = await supabase.from('pins').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}
