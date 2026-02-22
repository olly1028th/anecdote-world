import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { listTripPhotos } from '../lib/storage';
import { sampleTrips } from '../utils/sampleData';
import type { Trip, PlacePriority } from '../types/trip';
import type {
  Trip as DbTrip,
  Expense as DbExpense,
  ChecklistItem as DbChecklistItem,
  Pin,
  PinPhoto,
} from '../types/database';

// ---- 데모 모드 로컬 저장소 (localStorage 영구 보관) ----

const DEMO_TRIPS_KEY = 'anecdote-demo-trips';

function loadDemoTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(DEMO_TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

let demoExtraTrips: Trip[] = loadDemoTrips();

export function addDemoTrip(trip: Trip) {
  demoExtraTrips = [trip, ...demoExtraTrips];
  localStorage.setItem(DEMO_TRIPS_KEY, JSON.stringify(demoExtraTrips));
}

/**
 * DB 행(snake_case) → UI Trip 타입(camelCase) 매핑.
 * pins → itinerary/places/destination, pin_photos → photos 로 변환.
 */
function mapDbTripToUi(
  db: DbTrip,
  expenses: DbExpense[],
  checklist: DbChecklistItem[],
  pins: Pin[],
  pinPhotos: PinPhoto[],
  storagePhotos: string[] = [],
): Trip {
  // destination: 핀들의 도시/나라 조합
  const cityCountry = [...new Set(
    pins.filter((p) => p.city || p.country).map((p) =>
      [p.city, p.country].filter(Boolean).join(', '),
    ),
  )];
  const destination = cityCountry.join(' / ');

  // itinerary: 방문한(visited) 핀 중 day_number가 있는 것을 일자별로 그룹
  const visitedPins = pins
    .filter((p) => p.visit_status === 'visited' && p.day_number != null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const dayGroups = new Map<number, Pin[]>();
  for (const pin of visitedPins) {
    const day = pin.day_number!;
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(pin);
  }
  const itinerary = [...dayGroups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, dayPins]) => ({
      day,
      title: dayPins.map((p) => p.name).join(' & '),
      description: dayPins.map((p) => p.note).filter(Boolean).join(' → '),
    }));

  // places: 계획/위시리스트 핀 → 추천 장소
  const placePins = pins.filter(
    (p) => p.visit_status === 'planned' || p.visit_status === 'wishlist',
  );
  const places = placePins.map((p) => ({
    name: p.name,
    priority: (p.visit_status === 'planned' ? 'want' : 'maybe') as PlacePriority,
    note: p.note,
  }));

  // photos: Storage 사진 + 핀 사진 합치기 (중복 제거)
  const pinIdSet = new Set(pins.map((p) => p.id));
  const pinPhotoUrls = pinPhotos
    .filter((pp) => pinIdSet.has(pp.pin_id))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((pp) => pp.url);
  const photos = [...new Set([...storagePhotos, ...pinPhotoUrls])];

  return {
    id: db.id,
    title: db.title,
    destination,
    status: db.status,
    startDate: db.start_date ?? '',
    endDate: db.end_date ?? '',
    coverImage: db.cover_image,
    memo: db.memo,
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      label: e.label,
    })),
    itinerary,
    photos,
    places,
    checklist: checklist.map((c) => ({
      id: c.id,
      text: c.text,
      checked: c.checked,
    })),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    // Supabase 미설정 → 데모 모드 (로컬 추가 여행 포함)
    if (!isSupabaseConfigured) {
      setTrips([...demoExtraTrips, ...sampleTrips]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: dbTrips, error: tripsErr } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsErr) throw tripsErr;
      if (!dbTrips || dbTrips.length === 0) {
        // DB에 여행 없으면 데모 데이터 + 로컬 추가분 표시
        setTrips([...demoExtraTrips, ...sampleTrips]);
        return;
      }

      const tripIds = dbTrips.map((t: DbTrip) => t.id);

      // 관련 데이터 병렬 조회 (핀 + 핀사진 포함)
      const [expensesRes, checklistRes, pinsRes] = await Promise.all([
        supabase.from('expenses').select('*').in('trip_id', tripIds),
        supabase
          .from('checklist_items')
          .select('*')
          .in('trip_id', tripIds)
          .order('sort_order'),
        supabase
          .from('pins')
          .select('*')
          .in('trip_id', tripIds)
          .order('sort_order'),
      ]);

      const allExpenses: DbExpense[] = expensesRes.data ?? [];
      const allChecklist: DbChecklistItem[] = checklistRes.data ?? [];
      const allPins: Pin[] = (pinsRes.data as Pin[]) ?? [];

      // 핀 사진 조회 (핀이 있을 때만)
      let allPinPhotos: PinPhoto[] = [];
      const pinIds = allPins.map((p) => p.id);
      if (pinIds.length > 0) {
        const ppRes = await supabase
          .from('pin_photos')
          .select('*')
          .in('pin_id', pinIds)
          .order('sort_order');
        allPinPhotos = (ppRes.data as PinPhoto[]) ?? [];
      }

      const mapped = dbTrips.map((t: DbTrip) =>
        mapDbTripToUi(
          t,
          allExpenses.filter((e) => e.trip_id === t.id),
          allChecklist.filter((c) => c.trip_id === t.id),
          allPins.filter((p) => p.trip_id === t.id),
          allPinPhotos,
        ),
      );

      setTrips([...demoExtraTrips, ...mapped]);
    } catch {
      // Supabase 실패 시 데모 데이터로 폴백
      setTrips([...demoExtraTrips, ...sampleTrips]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // 모달 등에서 여행 추가 시 자동 refetch
  useEffect(() => {
    const handler = () => fetchTrips();
    window.addEventListener('trip-added', handler);
    return () => window.removeEventListener('trip-added', handler);
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

// ---- Trip Mutations ----

export interface TripInput {
  title: string;
  status: 'planned' | 'completed';
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  memo?: string;
}

export async function createTrip(input: TripInput): Promise<string> {
  const { data, error } = await supabase
    .from('trips')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTrip(id: string, input: Partial<TripInput>): Promise<void> {
  const { error } = await supabase.from('trips').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

// ---- 경비 저장 ----

export async function saveExpenses(
  tripId: string,
  expenses: { category: string; amount: number; label: string }[],
): Promise<void> {
  // 기존 경비 삭제
  const { error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId);
  if (delErr) throw delErr;

  // 새 경비 삽입
  if (expenses.length > 0) {
    const { error: insErr } = await supabase.from('expenses').insert(
      expenses.map((e) => ({
        trip_id: tripId,
        category: e.category,
        amount: e.amount,
        label: e.label,
      })),
    );
    if (insErr) throw insErr;
  }
}

// ---- 체크리스트 저장 ----

export async function saveChecklistItems(
  tripId: string,
  items: { text: string; checked: boolean }[],
): Promise<void> {
  // 기존 항목 삭제
  const { error: delErr } = await supabase
    .from('checklist_items')
    .delete()
    .eq('trip_id', tripId);
  if (delErr) throw delErr;

  // 새 항목 삽입
  if (items.length > 0) {
    const { error: insErr } = await supabase.from('checklist_items').insert(
      items.map((item, i) => ({
        trip_id: tripId,
        text: item.text,
        checked: item.checked,
        sort_order: i,
      })),
    );
    if (insErr) throw insErr;
  }
}

// ---- 체크리스트 토글 ----

export async function toggleChecklistItem(
  itemId: string,
  checked: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ checked })
    .eq('id', itemId);
  if (error) throw error;
}

/** 단일 여행 조회 (ID로) */
export function useTrip(id: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;

    // 데모 모드 (로컬 추가 여행 포함)
    if (!isSupabaseConfigured) {
      const allDemoTrips = [...demoExtraTrips, ...sampleTrips];
      setTrip(allDemoTrips.find((t) => t.id === id) ?? null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: dbTrip, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (tripErr) throw tripErr;
      if (!dbTrip) {
        setTrip(null);
        return;
      }

      const [expensesRes, checklistRes, pinsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('trip_id', id),
        supabase
          .from('checklist_items')
          .select('*')
          .eq('trip_id', id)
          .order('sort_order'),
        supabase
          .from('pins')
          .select('*')
          .eq('trip_id', id)
          .order('sort_order'),
      ]);

      const pins: Pin[] = (pinsRes.data as Pin[]) ?? [];

      // 핀 사진 + Storage 사진 조회
      let pinPhotos: PinPhoto[] = [];
      const pinIds = pins.map((p) => p.id);
      if (pinIds.length > 0) {
        const ppRes = await supabase
          .from('pin_photos')
          .select('*')
          .in('pin_id', pinIds)
          .order('sort_order');
        pinPhotos = (ppRes.data as PinPhoto[]) ?? [];
      }

      // Storage에 업로드된 여행 사진 조회
      let storagePhotos: string[] = [];
      try {
        storagePhotos = await listTripPhotos(id);
      } catch {
        // Storage 버킷 미생성 시 무시
      }

      setTrip(
        mapDbTripToUi(
          dbTrip as DbTrip,
          (expensesRes.data ?? []) as DbExpense[],
          (checklistRes.data ?? []) as DbChecklistItem[],
          pins,
          pinPhotos,
          storagePhotos,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '여행을 불러오지 못했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    refetch();
  }, [id, refetch]);

  return { trip, loading, error, refetch };
}
