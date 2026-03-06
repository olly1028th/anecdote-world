import { useMemo } from 'react';
import { useTrips } from './useTrips';
import { usePins } from './usePins';
import { getMapDisplayPins } from '../utils/mapPins';
import { totalExpensesInKRW } from '../utils/format';
import type { Trip } from '../types/trip';
import type { Pin } from '../types/database';

// ---- Return types ----

export interface ExpenseByCategoryItem {
  category: string;
  amount: number;
  label: string;
}

export interface PinByCategoryItem {
  category: string;
  count: number;
}

export interface PinsByStatus {
  visited: number;
  planned: number;
  wishlist: number;
}

export interface ChecklistProgress {
  total: number;
  checked: number;
}

export interface Stats {
  completedCount: number;
  plannedCount: number;
  totalSpent: number;
  avgExpensePerTrip: number;
  expenseByCategory: ExpenseByCategoryItem[];
  countriesVisited: string[];
  citiesVisited: string[];
  pinsByCategory: PinByCategoryItem[];
  pinsByStatus: PinsByStatus;
  /** 전체 등록 핀 수 (좌표/day_number 필터 무관) */
  totalPins: number;
  totalPhotos: number;
  checklistProgress: ChecklistProgress;
  loading: boolean;
}

interface UseStatsOptions {
  trips?: Trip[];
  pins?: Pin[];
  tripsLoading?: boolean;
  pinsLoading?: boolean;
}

/**
 * Dashboard 통계를 기존 trip / pin 데이터로부터 순수 계산하는 훅.
 * trips/pins를 파라미터로 받으면 내부 useTrips()/usePins() 호출을 건너뛴다.
 */
export function useStats(options?: UseStatsOptions): Stats {
  const internal = useStatsInternal(options);
  const trips = options?.trips ?? internal.trips;
  const pins = options?.pins ?? internal.pins;
  const loading = (options?.tripsLoading ?? internal.tripsLoading) || (options?.pinsLoading ?? internal.pinsLoading);

  const stats = useMemo<Omit<Stats, 'loading'>>(() => {
    // ---- Trip 기반 통계 ----
    const completedTrips = trips.filter((t) => t.status === 'completed');
    const plannedTrips = trips.filter((t) => t.status === 'planned');

    const completedCount = completedTrips.length;
    const plannedCount = plannedTrips.length;

    // 총 지출 (completed trips only, 다중 통화 KRW 환산)
    const allExpenses = completedTrips.flatMap((trip) => trip.expenses);
    const totalSpent = totalExpensesInKRW(allExpenses);

    // 평균 지출 (completed trips)
    const avgExpensePerTrip = completedCount > 0 ? totalSpent / completedCount : 0;

    // 카테고리별 지출 (completed trips only, KRW 환산)
    const categoryMap = new Map<string, { amount: number; label: string }>();
    for (const trip of completedTrips) {
      for (const exp of trip.expenses) {
        const krwAmount = totalExpensesInKRW([exp]);
        const existing = categoryMap.get(exp.category);
        if (existing) {
          existing.amount += krwAmount;
        } else {
          categoryMap.set(exp.category, { amount: krwAmount, label: exp.label });
        }
      }
    }
    const expenseByCategory: ExpenseByCategoryItem[] = Array.from(categoryMap.entries()).map(
      ([category, { amount, label }]) => ({ category, amount, label }),
    );

    // 총 사진 수
    const totalPhotos = trips.reduce((sum, trip) => sum + trip.photos.length, 0);

    // 체크리스트 진행률 (planned trips only)
    const checklistProgress: ChecklistProgress = { total: 0, checked: 0 };
    for (const trip of plannedTrips) {
      for (const item of trip.checklist) {
        checklistProgress.total += 1;
        if (item.checked) checklistProgress.checked += 1;
      }
    }

    // ---- Pin 기반 통계 ----

    // 국가/도시 카운트: 모든 핀에서 유효한 country/city 텍스트 기반 집계.
    // getMapDisplayPins 좌표 필터와 독립 — 좌표가 (0,0)이거나
    // day_number가 있는 핀도 국가/도시 통계에 포함시킨다.
    const visitedPins = pins.filter((p) => p.visit_status === 'visited');

    // 방문한 국가 (unique)
    const countriesVisited = Array.from(
      new Set(visitedPins.map((p) => p.country).filter(Boolean)),
    );

    // 방문한 도시 (unique)
    const citiesVisited = Array.from(
      new Set(visitedPins.map((p) => p.city).filter(Boolean)),
    );

    // 카테고리/상태 통계는 세계지도 표시 핀 기준 (지도와 수치 일치)
    const mapPins = getMapDisplayPins(pins);

    // 카테고리별 핀 수
    const pinCategoryMap = new Map<string, number>();
    for (const pin of mapPins) {
      pinCategoryMap.set(pin.category, (pinCategoryMap.get(pin.category) ?? 0) + 1);
    }
    const pinsByCategory: PinByCategoryItem[] = Array.from(pinCategoryMap.entries()).map(
      ([category, count]) => ({ category, count }),
    );

    // 상태별 핀 수
    const pinsByStatus: PinsByStatus = { visited: 0, planned: 0, wishlist: 0 };
    for (const pin of mapPins) {
      pinsByStatus[pin.visit_status] += 1;
    }

    return {
      completedCount,
      plannedCount,
      totalSpent,
      avgExpensePerTrip,
      expenseByCategory,
      countriesVisited,
      citiesVisited,
      pinsByCategory,
      pinsByStatus,
      totalPins: pins.length,
      totalPhotos,
      checklistProgress,
    };
  }, [trips, pins]);

  return { ...stats, loading };
}

/** 내부 훅: options가 없을 때만 useTrips/usePins 호출 */
function useStatsInternal(options?: UseStatsOptions) {
  const skipTrips = !!options?.trips;
  const skipPins = !!options?.pins;
  const tripsResult = useTrips(skipTrips);
  const pinsResult = usePins(skipPins);
  return {
    trips: tripsResult.trips,
    pins: pinsResult.pins,
    tripsLoading: tripsResult.loading,
    pinsLoading: pinsResult.loading,
  };
}
