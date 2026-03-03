import { useMemo } from 'react';
import { useTrips } from './useTrips';
import { usePins } from './usePins';
import { getMapDisplayPins } from '../utils/mapPins';

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
  totalPhotos: number;
  checklistProgress: ChecklistProgress;
  loading: boolean;
}

/**
 * Dashboard 통계를 기존 trip / pin 데이터로부터 순수 계산하는 훅.
 * 외부 의존성 없이 useTrips(), usePins() 결과만 사용한다.
 */
export function useStats(): Stats {
  const { trips, loading: tripsLoading } = useTrips();
  const { pins, loading: pinsLoading } = usePins();

  const loading = tripsLoading || pinsLoading;

  const stats = useMemo<Omit<Stats, 'loading'>>(() => {
    // ---- Trip 기반 통계 ----
    const completedTrips = trips.filter((t) => t.status === 'completed');
    const plannedTrips = trips.filter((t) => t.status === 'planned');

    const completedCount = completedTrips.length;
    const plannedCount = plannedTrips.length;

    // 총 지출 (completed trips only)
    const totalSpent = completedTrips.reduce(
      (sum, trip) => sum + trip.expenses.reduce((s, e) => s + e.amount, 0),
      0,
    );

    // 평균 지출 (completed trips)
    const avgExpensePerTrip = completedCount > 0 ? totalSpent / completedCount : 0;

    // 카테고리별 지출 (completed trips only)
    const categoryMap = new Map<string, { amount: number; label: string }>();
    for (const trip of completedTrips) {
      for (const exp of trip.expenses) {
        const existing = categoryMap.get(exp.category);
        if (existing) {
          existing.amount += exp.amount;
        } else {
          categoryMap.set(exp.category, { amount: exp.amount, label: exp.label });
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
    // 세계지도와 동일한 필터: 메인 핀 + day-number만 있는 여행의 대표 핀 포함
    const mapPins = getMapDisplayPins(pins);
    const visitedPins = mapPins.filter((p) => p.visit_status === 'visited');

    // 방문한 국가 (unique)
    const countriesVisited = Array.from(
      new Set(visitedPins.map((p) => p.country).filter(Boolean)),
    );

    // 방문한 도시 (unique)
    const citiesVisited = Array.from(
      new Set(visitedPins.map((p) => p.city).filter(Boolean)),
    );

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
      totalPhotos,
      checklistProgress,
    };
  }, [trips, pins]);

  return { ...stats, loading };
}
