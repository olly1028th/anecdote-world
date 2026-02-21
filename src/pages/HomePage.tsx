import { useState, lazy, Suspense } from 'react';
import type { TripStatus } from '../types/trip';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import TripCard from '../components/TripCard';
import { formatCurrency, totalExpenses } from '../utils/format';

const WorldMap = lazy(() =>
  import('../components/Map').then((m) => ({ default: m.WorldMap })),
);

type Filter = 'all' | TripStatus;
type PinFilter = 'all' | VisitStatus;

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const { trips, loading, error } = useTrips();
  const { pins, loading: pinsLoading } = usePins();

  const filtered =
    filter === 'all' ? trips : trips.filter((t) => t.status === filter);

  const filteredPins =
    pinFilter === 'all' ? pins : pins.filter((p) => p.visit_status === pinFilter);

  const completedCount = trips.filter((t) => t.status === 'completed').length;
  const plannedCount = trips.filter((t) => t.status === 'planned').length;
  const totalSpent = totalExpenses(
    trips
      .filter((t) => t.status === 'completed')
      .flatMap((t) => t.expenses),
  );

  const tripFilters: { key: Filter; label: string }[] = [
    { key: 'all', label: `전체 (${trips.length})` },
    { key: 'completed', label: `완료 (${completedCount})` },
    { key: 'planned', label: `계획 중 (${plannedCount})` },
  ];

  const pinFilters: { key: PinFilter; label: string }[] = [
    { key: 'all', label: `전체 (${pins.length})` },
    { key: 'visited', label: `방문 (${pins.filter((p) => p.visit_status === 'visited').length})` },
    { key: 'planned', label: `계획 (${pins.filter((p) => p.visit_status === 'planned').length})` },
    { key: 'wishlist', label: `위시 (${pins.filter((p) => p.visit_status === 'wishlist').length})` },
  ];

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-gray-400">여행 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#FF6B6B]">{error}</p>
        <p className="text-sm text-gray-400 mt-2">새로고침해주세요.</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-8">
      {/* 세계지도 히어로 */}
      <section>
        <div className="relative h-[380px] rounded-3xl overflow-hidden shadow-md">
          {pinsLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-white">
              <div className="animate-pulse text-gray-400">지도를 불러오는 중...</div>
            </div>
          ) : (
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-white"><div className="animate-pulse text-gray-400">지도를 불러오는 중...</div></div>}>
              <WorldMap pins={filteredPins} />
            </Suspense>
          )}

          {/* 핀 필터 오버레이 */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-[1000]">
            {pinFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setPinFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer backdrop-blur-md ${
                  pinFilter === f.key
                    ? 'bg-[#FF6B6B] text-white shadow-md'
                    : 'bg-white/80 text-gray-600 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 범례 오버레이 */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3 z-[1000] bg-white/80 backdrop-blur-md rounded-full px-4 py-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 방문
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 계획
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 위시
            </span>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-[#FFD166]/10 p-5 rounded-3xl border-2 border-dashed border-[#FFD166]">
        <h3 className="text-sm font-bold text-[#FF9F43] mb-3">Where have you been? 🌍</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <div className="bg-white p-3 rounded-2xl shadow-sm min-w-[100px] text-center">
            <span className="block text-xl">✈️</span>
            <span className="block text-xs font-bold mt-1">{completedCount} 여행 완료</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm min-w-[100px] text-center">
            <span className="block text-xl">📋</span>
            <span className="block text-xs font-bold mt-1">{plannedCount} 계획 중</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm min-w-[100px] text-center">
            <span className="block text-xl">💰</span>
            <span className="block text-xs font-bold mt-1">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm min-w-[100px] text-center">
            <span className="block text-xl">📍</span>
            <span className="block text-xs font-bold mt-1">{pins.length} 핀</span>
          </div>
        </div>
      </section>

      {/* My Shiny Journal */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-[#2D3436]">My Shiny Journal</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6]" />
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-5">
          {tripFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-[#FF6B6B] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">🧳</p>
            <p className="text-base font-medium">아직 여행이 없어요</p>
            <p className="text-sm mt-1">아래 + 버튼으로 새 여행을 추가해보세요!</p>
          </div>
        )}
      </section>
    </div>
  );
}
