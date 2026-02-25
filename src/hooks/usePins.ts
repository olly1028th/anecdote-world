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
    name: '센소지',
    address: '2 Chome-3-1 Asakusa, Taito City, Tokyo',
    lat: 35.7148,
    lng: 139.7967,
    country: '일본',
    city: '도쿄',
    visit_status: 'visited',
    visited_at: '2025-03-16',
    category: 'landmark',
    rating: 5,
    note: '아사쿠사의 상징, 야경이 특히 아름다움',
    day_number: 2,
    sort_order: 0,
    created_at: '2025-03-25T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
  },
  {
    id: 'pin-2',
    user_id: 'demo-user-001',
    trip_id: '1',
    name: '시부야 스카이',
    address: '2 Chome-24-12 Shibuya, Tokyo',
    lat: 35.6580,
    lng: 139.7016,
    country: '일본',
    city: '도쿄',
    visit_status: 'visited',
    visited_at: '2025-03-15',
    category: 'landmark',
    rating: 4,
    note: '시부야 스크램블 교차로를 위에서 내려다봄',
    day_number: 1,
    sort_order: 0,
    created_at: '2025-03-25T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
  },
  {
    id: 'pin-3',
    user_id: 'demo-user-001',
    trip_id: '2',
    name: '왓포 (왓 포)',
    address: '2 Sanam Chai Rd, Bangkok',
    lat: 13.7465,
    lng: 100.4930,
    country: '태국',
    city: '방콕',
    visit_status: 'visited',
    visited_at: '2025-01-10',
    category: 'landmark',
    rating: 5,
    note: '거대한 와불상이 인상적',
    day_number: 1,
    sort_order: 0,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'pin-4',
    user_id: 'demo-user-001',
    trip_id: '2',
    name: '짜뚜짝 주말시장',
    address: 'Kamphaeng Phet 2 Rd, Bangkok',
    lat: 13.7999,
    lng: 100.5500,
    country: '태국',
    city: '방콕',
    visit_status: 'visited',
    visited_at: '2025-01-11',
    category: 'shopping',
    rating: 4,
    note: '엄청 넓음! 반나절은 필요',
    day_number: 2,
    sort_order: 0,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
  },
  {
    id: 'pin-5',
    user_id: 'demo-user-001',
    trip_id: '3',
    name: '콜로세움',
    address: 'Piazza del Colosseo, Roma',
    lat: 41.8902,
    lng: 12.4922,
    country: '이탈리아',
    city: '로마',
    visit_status: 'planned',
    visited_at: null,
    category: 'landmark',
    rating: null,
    note: '오전 일찍 가야 줄이 짧다',
    day_number: 1,
    sort_order: 0,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'pin-6',
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
    id: 'pin-7',
    user_id: 'demo-user-001',
    trip_id: '4',
    name: '성산일출봉',
    address: '제주특별자치도 서귀포시 성산읍',
    lat: 33.4612,
    lng: 126.9405,
    country: '한국',
    city: '제주',
    visit_status: 'planned',
    visited_at: null,
    category: 'nature',
    rating: null,
    note: '일출 보기',
    day_number: 1,
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
      setPins(dbPins);
    } catch (err) {
      setPins([]);
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
