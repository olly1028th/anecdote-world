import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Pin } from '../types/database';

/** 데모 모드용 사용자 추가 핀 – localStorage 로 영구 보관 */
const DEMO_PINS_KEY = 'anecdote-demo-pins';

function loadDemoPins(): Pin[] {
  try {
    const raw = localStorage.getItem(DEMO_PINS_KEY);
    return raw ? (JSON.parse(raw) as Pin[]) : [];
  } catch {
    return [];
  }
}

let demoExtraPins: Pin[] = loadDemoPins();

export function addDemoPin(pin: Pin) {
  demoExtraPins = [pin, ...demoExtraPins];
  localStorage.setItem(DEMO_PINS_KEY, JSON.stringify(demoExtraPins));
}

const samplePins: Pin[] = [
  {
    id: 'pin-1',
    user_id: 'demo-user-001',
    trip_id: '1',
    name: '도쿄',
    address: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
    country: '일본',
    city: '도쿄',
    visit_status: 'visited',
    visited_at: '2025-03-15',
    category: 'landmark',
    rating: 5,
    note: '벚꽃 시즌 도쿄 여행',
    day_number: null,
    sort_order: 0,
    created_at: '2025-03-25T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
  },
  {
    id: 'pin-2',
    user_id: 'demo-user-001',
    trip_id: '2',
    name: '방콕',
    address: 'Bangkok, Thailand',
    lat: 13.7563,
    lng: 100.5018,
    country: '태국',
    city: '방콕',
    visit_status: 'visited',
    visited_at: '2025-01-10',
    category: 'landmark',
    rating: 5,
    note: '방콕 먹방 여행',
    day_number: null,
    sort_order: 0,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'pin-3',
    user_id: 'demo-user-001',
    trip_id: '3',
    name: '로마',
    address: 'Roma, Italy',
    lat: 41.9028,
    lng: 12.4964,
    country: '이탈리아',
    city: '로마',
    visit_status: 'planned',
    visited_at: null,
    category: 'landmark',
    rating: null,
    note: '유럽 여행 첫 번째 도시',
    day_number: null,
    sort_order: 0,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'pin-4',
    user_id: 'demo-user-001',
    trip_id: null,
    name: '산토리니',
    address: 'Oia, Santorini, Greece',
    lat: 36.4618,
    lng: 25.3753,
    country: '그리스',
    city: '산토리니',
    visit_status: 'wishlist',
    visited_at: null,
    category: 'landmark',
    rating: null,
    note: '석양이 세계에서 가장 아름다운 곳',
    day_number: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pin-5',
    user_id: 'demo-user-001',
    trip_id: '4',
    name: '제주도',
    address: '제주특별자치도',
    lat: 33.4890,
    lng: 126.4983,
    country: '한국',
    city: '제주',
    visit_status: 'planned',
    visited_at: null,
    category: 'nature',
    rating: null,
    note: '제주도 힐링 여행',
    day_number: null,
    sort_order: 0,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
];

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPins([...demoExtraPins, ...samplePins]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      const dbPins = (data as Pin[]) ?? [];

      // Supabase 성공 시에도 로컬 데모 핀 병합 (fallback으로 저장된 핀 포함)
      const demoPins = [...demoExtraPins, ...samplePins];
      const dbIds = new Set(dbPins.map((p) => p.id));
      const extraDemoPins = demoPins.filter((p) => !dbIds.has(p.id));
      setPins([...dbPins, ...extraDemoPins]);
    } catch (err) {
      // Supabase 실패 시 데모 데이터로 fallback
      setPins([...demoExtraPins, ...samplePins]);
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
  const { data, error } = await supabase
    .from('pins')
    .insert({ ...input, user_id: user?.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updatePin(id: string, input: Partial<PinInput>): Promise<void> {
  const { error } = await supabase.from('pins').update(input).eq('id', id);
  if (error) throw error;
}

export async function deletePin(id: string): Promise<void> {
  const { error } = await supabase.from('pins').delete().eq('id', id);
  if (error) throw error;
}
