/**
 * 로컬 전용 데이터를 Supabase에 동기화
 *
 * Supabase INSERT 실패 시 localStorage에 fallback으로 저장된 여행/핀을
 * 앱 시작 시점에 다시 Supabase로 업로드 시도.
 * 성공 시 localStorage에서 제거하여 기기 간 데이터 일관성 보장.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { getLocalTrips, getLocalPins, removeLocalTrip, removeLocalPin } from './localStore';
import type { Trip } from '../types/trip';

const SYNC_LOCK_KEY = 'anecdote-sync-lock';

export async function syncLocalDataToSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;

  // 동시 실행 방지
  const lock = localStorage.getItem(SYNC_LOCK_KEY);
  if (lock && Date.now() - Number(lock) < 30_000) return;
  localStorage.setItem(SYNC_LOCK_KEY, String(Date.now()));

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      localStorage.removeItem(SYNC_LOCK_KEY);
      return;
    }

    const localTrips = getLocalTrips();
    const localPins = getLocalPins();

    if (localTrips.length === 0 && localPins.length === 0) {
      localStorage.removeItem(SYNC_LOCK_KEY);
      return;
    }

    // 기존 DB 여행 ID 조회 (중복 방지)
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('user_id', user.id);
    const existingTripIds = new Set((existingTrips ?? []).map((t: { id: string }) => t.id));

    // 기존 DB 핀 조회 (중복 방지: trip_id + name으로 매칭)
    const { data: existingPins } = await supabase
      .from('pins')
      .select('id, trip_id, name')
      .eq('user_id', user.id);
    const existingPinKeys = new Set(
      (existingPins ?? []).map((p: { trip_id: string | null; name: string }) => `${p.trip_id}::${p.name}`),
    );

    // 오래된 demo ID → 새 Supabase UUID 매핑
    const tripIdMap = new Map<string, string>();

    // 여행 동기화
    for (const trip of localTrips) {
      // 이미 Supabase에 존재하는 여행 → 하위 데이터(expenses/checklist/places)만 동기화 시도
      if (existingTripIds.has(trip.id)) {
        try {
          await syncSubDataForExistingTrip(trip, user.id);
        } catch (err) {
          console.warn(`[syncLocal] 하위 데이터 동기화 실패 (trip ${trip.id}):`, err);
        }
        removeLocalTrip(trip.id);
        continue;
      }

      try {
        const { data, error } = await supabase
          .from('trips')
          .insert({
            title: trip.title,
            status: trip.status,
            start_date: trip.startDate || null,
            end_date: trip.endDate || null,
            cover_image: trip.coverImage || null,
            memo: trip.memo || null,
            user_id: user.id,
          })
          .select('id')
          .single();

        if (error || !data) {
          console.warn(`[syncLocal] trip INSERT 실패 (${trip.id}):`, error?.message);
          continue;
        }

        const newTripId = data.id;
        tripIdMap.set(trip.id, newTripId);

        // 여행 내 경비 동기화
        if (trip.expenses && trip.expenses.length > 0) {
          const validExpenses = trip.expenses.filter((e) => e.amount > 0);
          if (validExpenses.length > 0) {
            await supabase.from('expenses').insert(
              validExpenses.map((e) => ({
                trip_id: newTripId,
                user_id: user.id,
                category: e.category,
                amount: e.amount,
                label: e.label,
              })),
            );
          }
        }

        // 여행 내 체크리스트 동기화
        if (trip.checklist && trip.checklist.length > 0) {
          const validItems = trip.checklist.filter((c) => c.text.trim());
          if (validItems.length > 0) {
            await supabase.from('checklist_items').insert(
              validItems.map((c, i) => ({
                trip_id: newTripId,
                user_id: user.id,
                text: c.text,
                checked: c.checked,
                sort_order: i,
              })),
            );
          }
        }

        // 여행 내 장소(places) → 핀으로 동기화
        if (trip.places && trip.places.length > 0) {
          const validPlaces = trip.places.filter((p) => p.name.trim());
          if (validPlaces.length > 0) {
            await supabase.from('pins').insert(
              validPlaces.map((p, i) => ({
                trip_id: newTripId,
                user_id: user.id,
                name: p.name,
                lat: p.lat ?? 0,
                lng: p.lng ?? 0,
                country: '',
                city: '',
                address: p.priority,
                visit_status: p.priority === 'maybe' ? 'wishlist' as const : 'planned' as const,
                day_number: p.day ?? null,
                note: p.time ? `[${p.time}] ${p.note || ''}` : (p.note || ''),
                sort_order: i,
                category: 'other' as const,
              })),
            );
          }
        }

        removeLocalTrip(trip.id);
      } catch (err) {
        console.warn(`[syncLocal] trip 동기화 실패 (${trip.id}), 다음 시작 시 재시도:`, err);
      }
    }

    // 핀 동기화 (별도 저장된 핀: destination 핀 등)
    for (const pin of localPins) {
      const mappedTripId = pin.trip_id ? (tripIdMap.get(pin.trip_id) ?? pin.trip_id) : null;

      // trip_id가 아직 demo- 접두사인 경우 (관련 여행 동기화 실패) → 건너뜀
      if (mappedTripId && mappedTripId.startsWith('demo-')) continue;

      // 중복 방지: 같은 trip_id + name 조합이 이미 DB에 존재
      const key = `${mappedTripId}::${pin.name}`;
      if (existingPinKeys.has(key)) {
        removeLocalPin(pin.id);
        continue;
      }

      try {
        const { error } = await supabase
          .from('pins')
          .insert({
            user_id: user.id,
            trip_id: mappedTripId,
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            address: pin.address || '',
            country: pin.country || '',
            city: pin.city || '',
            visit_status: pin.visit_status,
            visited_at: pin.visited_at || null,
            category: pin.category || 'other',
            rating: pin.rating || null,
            note: pin.note || '',
            day_number: pin.day_number ?? null,
            sort_order: pin.sort_order ?? 0,
          });

        if (!error) {
          removeLocalPin(pin.id);
        } else {
          console.warn(`[syncLocal] pin INSERT 실패 (${pin.id}):`, error.message);
        }
      } catch (err) {
        console.warn(`[syncLocal] pin 동기화 실패 (${pin.id}), 다음 시작 시 재시도:`, err);
      }
    }
  } finally {
    localStorage.removeItem(SYNC_LOCK_KEY);
  }
}

/**
 * 이미 DB에 존재하는 trip의 하위 데이터(expenses, checklist, places)를 동기화.
 * Supabase INSERT는 성공했지만 하위 데이터 저장이 실패하여
 * updateLocalTrip fallback으로 로컬에만 저장된 경우를 처리.
 */
async function syncSubDataForExistingTrip(trip: Trip, userId: string): Promise<void> {
  const tripId = trip.id;

  // 경비 동기화: 로컬에 있고 DB에 없으면 업로드
  if (trip.expenses && trip.expenses.length > 0) {
    const { data: dbExpenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId);
    if (!dbExpenses || dbExpenses.length === 0) {
      const validExpenses = trip.expenses.filter((e) => e.amount > 0);
      if (validExpenses.length > 0) {
        const { error } = await supabase.from('expenses').insert(
          validExpenses.map((e) => ({
            trip_id: tripId,
            user_id: userId,
            category: e.category,
            amount: e.amount,
            label: e.label,
          })),
        );
        if (error) console.warn(`[syncLocal] expenses 동기화 실패:`, error.message);
      }
    }
  }

  // 체크리스트 동기화
  if (trip.checklist && trip.checklist.length > 0) {
    const { data: dbChecklist } = await supabase
      .from('checklist_items')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId);
    if (!dbChecklist || dbChecklist.length === 0) {
      const validItems = trip.checklist.filter((c) => c.text.trim());
      if (validItems.length > 0) {
        const { error } = await supabase.from('checklist_items').insert(
          validItems.map((c, i) => ({
            trip_id: tripId,
            user_id: userId,
            text: c.text,
            checked: c.checked,
            sort_order: i,
          })),
        );
        if (error) console.warn(`[syncLocal] checklist 동기화 실패:`, error.message);
      }
    }
  }

  // 장소(places) → 핀 동기화
  if (trip.places && trip.places.length > 0) {
    const { data: dbPlaces } = await supabase
      .from('pins')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .in('visit_status', ['planned', 'wishlist']);
    if (!dbPlaces || dbPlaces.length === 0) {
      const validPlaces = trip.places.filter((p) => p.name.trim());
      if (validPlaces.length > 0) {
        const { error } = await supabase.from('pins').insert(
          validPlaces.map((p, i) => ({
            trip_id: tripId,
            user_id: userId,
            name: p.name,
            lat: p.lat ?? 0,
            lng: p.lng ?? 0,
            country: '',
            city: '',
            address: p.priority,
            visit_status: p.priority === 'maybe' ? 'wishlist' as const : 'planned' as const,
            day_number: p.day ?? null,
            note: p.time ? `[${p.time}] ${p.note || ''}` : (p.note || ''),
            sort_order: i,
            category: 'other' as const,
          })),
        );
        if (error) console.warn(`[syncLocal] places 동기화 실패:`, error.message);
      }
    }
  }
}
