import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sampleTrips } from '../utils/sampleData';
import type { Trip } from '../types/trip';
import type {
  Trip as DbTrip,
  Expense as DbExpense,
  ChecklistItem as DbChecklistItem,
} from '../types/database';

/**
 * DB 행(snake_case) → UI Trip 타입(camelCase) 매핑.
 * pins → itinerary/places 매핑은 Phase 3에서 추가 예정.
 */
function mapDbTripToUi(
  db: DbTrip,
  expenses: DbExpense[],
  checklist: DbChecklistItem[],
): Trip {
  return {
    id: db.id,
    title: db.title,
    destination: '', // pins에서 도출 (Phase 3)
    status: db.status,
    startDate: db.start_date ?? '',
    endDate: db.end_date ?? '',
    coverImage: db.cover_image,
    memo: db.memo,
    expenses: expenses.map((e) => ({
      category: e.category,
      amount: e.amount,
      label: e.label,
    })),
    itinerary: [], // pins에서 도출 (Phase 3)
    photos: [], // pin_photos에서 도출 (Phase 4)
    places: [], // pins에서 도출 (Phase 3)
    checklist: checklist.map((c) => ({
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
    // Supabase 미설정 → 데모 모드
    if (!isSupabaseConfigured) {
      setTrips(sampleTrips);
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
        setTrips([]);
        return;
      }

      const tripIds = dbTrips.map((t: DbTrip) => t.id);

      // 관련 데이터 병렬 조회
      const [expensesRes, checklistRes] = await Promise.all([
        supabase.from('expenses').select('*').in('trip_id', tripIds),
        supabase
          .from('checklist_items')
          .select('*')
          .in('trip_id', tripIds)
          .order('sort_order'),
      ]);

      const allExpenses: DbExpense[] = expensesRes.data ?? [];
      const allChecklist: DbChecklistItem[] = checklistRes.data ?? [];

      const mapped = dbTrips.map((t: DbTrip) =>
        mapDbTripToUi(
          t,
          allExpenses.filter((e) => e.trip_id === t.id),
          allChecklist.filter((c) => c.trip_id === t.id),
        ),
      );

      setTrips(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : '여행 데이터를 불러오지 못했습니다';
      setError(message);
      console.error('useTrips error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

/** 단일 여행 조회 (ID로) */
export function useTrip(id: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // 데모 모드
    if (!isSupabaseConfigured) {
      setTrip(sampleTrips.find((t) => t.id === id) ?? null);
      setLoading(false);
      return;
    }

    (async () => {
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

        const [expensesRes, checklistRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('trip_id', id),
          supabase
            .from('checklist_items')
            .select('*')
            .eq('trip_id', id)
            .order('sort_order'),
        ]);

        setTrip(
          mapDbTripToUi(
            dbTrip as DbTrip,
            (expensesRes.data ?? []) as DbExpense[],
            (checklistRes.data ?? []) as DbChecklistItem[],
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '여행을 불러오지 못했습니다';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return { trip, loading, error };
}
