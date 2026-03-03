import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { listTripPhotos } from '../lib/storage';
import {
  getLocalTrips,
  getDeletedTripIds,
  getMergedDemoTrips,
} from '../lib/localStore';
import type { Trip, Place, PlacePriority } from '../types/trip';
import type {
  Trip as DbTrip,
  Expense as DbExpense,
  ChecklistItem as DbChecklistItem,
  Pin,
  PinPhoto,
} from '../types/database';

// 기존 API 호환을 위한 re-export (localStore.ts 에서 관리)
export { addLocalTrip as addDemoTrip, updateLocalTrip as updateDemoTrip, deleteLocalTrip as deleteDemoTrip } from '../lib/localStore';

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
  const placePins = pins
    .filter(
      (p) => p.visit_status === 'planned' || p.visit_status === 'wishlist',
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const places: Place[] = placePins.map((p) => {
    // Parse time from note if stored as [HH:MM] prefix
    const timeMatch = p.note?.match(/^\[(\d{2}:\d{2})\]\s?(.*)/);
    // Priority: use address field if it contains a valid priority, otherwise derive from visit_status
    const storedPriority = p.address;
    const priority = (['must', 'want', 'maybe'].includes(storedPriority)
      ? storedPriority
      : p.visit_status === 'planned' ? 'want' : 'maybe') as PlacePriority;
    const hasCoords = p.lat !== 0 || p.lng !== 0;
    return {
      name: p.name,
      priority,
      note: timeMatch ? timeMatch[2] : (p.note || ''),
      day: p.day_number ?? undefined,
      time: timeMatch ? timeMatch[1] : undefined,
      lat: hasCoords ? p.lat : undefined,
      lng: hasCoords ? p.lng : undefined,
    };
  });

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
  const mountedRef = useRef(true);

  const fetchTrips = useCallback(async () => {
    // Supabase 미설정 → 데모 모드 (로컬 추가 여행 포함)
    if (!isSupabaseConfigured) {
      if (!mountedRef.current) return;
      setTrips(getMergedDemoTrips());
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
        setTrips(getMergedDemoTrips());
        setLoading(false);
        return;
      }

      // 1) 내 여행 조회 (user_id 필터)
      const { data: myTrips, error: tripsErr } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tripsErr) throw tripsErr;

      // 2) 공유받은 여행 ID 조회
      let sharedTrips: DbTrip[] = [];
      if (userEmail) {
        const { data: shares } = await supabase
          .from('trip_shares')
          .select('trip_id')
          .eq('status', 'accepted')
          .or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`);
        const sharedTripIds = (shares ?? []).map((s: { trip_id: string }) => s.trip_id);
        const myTripIds = new Set((myTrips ?? []).map((t: DbTrip) => t.id));
        const uniqueSharedIds = sharedTripIds.filter((id) => !myTripIds.has(id));
        if (uniqueSharedIds.length > 0) {
          const { data } = await supabase
            .from('trips')
            .select('*')
            .in('id', uniqueSharedIds)
            .order('created_at', { ascending: false });
          sharedTrips = (data as DbTrip[]) ?? [];
        }
      }

      // 3) 전체 여행 병합
      const allDbTrips = [...(myTrips ?? []), ...sharedTrips] as DbTrip[];

      let mapped: Trip[] = [];
      if (allDbTrips.length > 0) {
        const tripIds = allDbTrips.map((t: DbTrip) => t.id);

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

        mapped = allDbTrips.map((t: DbTrip) =>
          mapDbTripToUi(
            t,
            allExpenses.filter((e) => e.trip_id === t.id),
            allChecklist.filter((c) => c.trip_id === t.id),
            allPins.filter((p) => p.trip_id === t.id),
            allPinPhotos,
          ),
        );
      }

      if (!mountedRef.current) return;

      // Supabase 성공 시에도 로컬 여행 포함 (Supabase INSERT 실패 시 fallback으로 저장된 여행)
      const dbIds = new Set(mapped.map((t) => t.id));
      const extraLocal = getLocalTrips().filter((t) => !dbIds.has(t.id) && !getDeletedTripIds().has(t.id));
      setTrips([...mapped, ...extraLocal]);
    } catch (err) {
      if (!mountedRef.current) return;
      // Supabase 실패 시 데모 데이터로 fallback (에러 토스트 없이 조용히 전환)
      setTrips(getMergedDemoTrips());
      console.warn('[useTrips] Supabase fetch failed, using local data:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchTrips();
    return () => { mountedRef.current = false; };
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
  status: 'planned' | 'completed' | 'wishlist';
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  memo?: string;
  user_id?: string;
}

export async function createTrip(input: TripInput): Promise<string> {
  // user_id가 없으면 현재 인증된 사용자의 ID를 자동으로 가져옴
  let userId = input.user_id;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }
  if (!userId) throw new Error('인증이 필요합니다');
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...input, user_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTrip(id: string, input: Partial<TripInput>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  const { error } = await supabase.from('trips').update(input).eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function deleteTrip(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  // 소유자만 삭제 가능
  const { error } = await supabase.from('trips').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ---- 경비 저장 ----

export async function saveExpenses(
  tripId: string,
  expenses: { category: string; amount: number; label: string }[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) throw new Error('인증이 필요합니다');

  // 기존 경비 삭제 (소유자 여행만)
  const { error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (delErr) throw delErr;

  // 새 경비 삽입
  if (expenses.length > 0) {
    const { error: insErr } = await supabase.from('expenses').insert(
      expenses.map((e) => ({
        trip_id: tripId,
        user_id: userId,
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
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) throw new Error('인증이 필요합니다');

  // 기존 항목 삭제 (소유자 데이터만)
  const { error: delErr } = await supabase
    .from('checklist_items')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (delErr) throw delErr;

  // 새 항목 삽입
  if (items.length > 0) {
    const { error: insErr } = await supabase.from('checklist_items').insert(
      items.map((item, i) => ({
        trip_id: tripId,
        user_id: userId,
        text: item.text,
        checked: item.checked,
        sort_order: i,
      })),
    );
    if (insErr) throw insErr;
  }
}

// ---- 일정(장소) 저장 ----

export async function savePlaces(
  tripId: string,
  places: Place[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) throw new Error('인증이 필요합니다');

  // 기존 planned/wishlist 핀 좌표 보존 (삭제 전에 조회)
  const { data: existingPins } = await supabase
    .from('pins')
    .select('name, lat, lng, country, city, category')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .in('visit_status', ['planned', 'wishlist']);
  const coordMap = new Map<string, { lat: number; lng: number; country: string; city: string; category: string }>();
  for (const pin of existingPins ?? []) {
    if (pin.lat !== 0 || pin.lng !== 0) {
      coordMap.set(pin.name, { lat: pin.lat, lng: pin.lng, country: pin.country, city: pin.city, category: pin.category });
    }
  }

  // 기존 planned/wishlist 핀 삭제 (visited 핀은 유지, 소유자 데이터만)
  const { error: delErr } = await supabase
    .from('pins')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .in('visit_status', ['planned', 'wishlist']);
  if (delErr) throw new Error(delErr.message);

  // 새 핀 삽입 (Place의 좌표를 그대로 사용, 없으면 0)
  if (places.length > 0) {
    const pins = places.map((p, i) => {
      const existing = coordMap.get(p.name);
      const lat = p.lat ?? 0;
      const lng = p.lng ?? 0;
      return {
        trip_id: tripId,
        user_id: userId,
        name: p.name,
        lat,
        lng,
        country: existing?.country ?? '',
        city: existing?.city ?? '',
        address: p.priority, // 우선순위를 address 필드에 저장 (round-trip 보존)
        visit_status: p.priority === 'maybe' ? 'wishlist' as const : 'planned' as const,
        day_number: p.day ?? null,
        note: p.time ? `[${p.time}] ${p.note || ''}` : (p.note || ''),
        sort_order: i,
        category: existing?.category ?? 'other' as const,
      };
    });
    const { error: insErr } = await supabase.from('pins').insert(pins);
    if (insErr) throw new Error(insErr.message);
  }
}

// ---- 체크리스트 토글 ----

export async function toggleChecklistItem(
  itemId: string,
  checked: boolean,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  const { error } = await supabase
    .from('checklist_items')
    .update({ checked })
    .eq('id', itemId)
    .eq('user_id', user.id);
  if (error) throw error;
}

/** 단일 여행 조회 (ID로) */
export function useTrip(id: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!id) return;

    // 데모 모드 (로컬 추가 여행 포함)
    if (!isSupabaseConfigured) {
      if (!mountedRef.current) return;
      setTrip(getMergedDemoTrips().find((t) => t.id === id) ?? null);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 현재 로그인한 사용자 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      if (!userId) {
        // 미로그인 → 데모 데이터에서 찾기
        setTrip(getMergedDemoTrips().find((t) => t.id === id) ?? null);
        setIsDemo(true);
        setLoading(false);
        return;
      }

      // 1차: 내 여행인지 확인 (user_id 필터 포함)
      const { data: myTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      let dbTrip = myTrip;

      // 2차: 내 여행이 아니면 공유받은 여행인지 확인
      if (!dbTrip) {
        const { data: share } = await supabase
          .from('trip_shares')
          .select('id')
          .eq('trip_id', id)
          .eq('status', 'accepted')
          .or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail ?? ''}`)
          .maybeSingle();
        if (!share) {
          // Supabase에 없는 여행 → 로컬 데이터 fallback 시도
          // (Supabase INSERT 실패 시 localStorage에 저장된 여행)
          const localFallback = getMergedDemoTrips().find((t) => t.id === id);
          if (localFallback) {
            setTrip(localFallback);
            setIsDemo(true);
            return;
          }
          setTrip(null);
          setIsDemo(false);
          setError('접근 권한이 없습니다');
          return;
        }
        // 공유 확인 후 여행 데이터 조회
        const { data: sharedTrip, error: sharedErr } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();
        if (sharedErr) throw sharedErr;
        dbTrip = sharedTrip;
      }

      if (!dbTrip) {
        setTrip(null);
        setIsDemo(false);
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

      if (!mountedRef.current) return;
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
      setIsDemo(false);
    } catch (err) {
      if (!mountedRef.current) return;
      // Supabase 조회 실패 시 데모 데이터에서 fallback 시도
      const demoFallback = getMergedDemoTrips().find((t) => t.id === id) ?? null;
      if (demoFallback) {
        setTrip(demoFallback);
        setIsDemo(true);
      } else {
        setTrip(null);
        setIsDemo(false);
        const msg = err instanceof Error ? err.message : '데이터를 불러올 수 없습니다';
        setError(`서버 연결 실패: ${msg}`);
      }
      console.error('[useTrip] Supabase fetch failed:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    if (!id) {
      setLoading(false);
      return;
    }
    refetch();
    return () => { mountedRef.current = false; };
  }, [id, refetch]);

  return { trip, loading, error, refetch, isDemo };
}
