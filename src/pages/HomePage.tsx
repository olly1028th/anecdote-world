import { useState } from 'react';
import type { TripStatus } from '../types/trip';
import { useTrips } from '../hooks/useTrips';
import TripCard from '../components/TripCard';
import { formatCurrency, totalExpenses } from '../utils/format';

type Filter = 'all' | TripStatus;

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { trips, loading, error } = useTrips();

  const filtered =
    filter === 'all' ? trips : trips.filter((t) => t.status === filter);

  const completedCount = trips.filter((t) => t.status === 'completed').length;
  const plannedCount = trips.filter((t) => t.status === 'planned').length;
  const totalSpent = totalExpenses(
    trips
      .filter((t) => t.status === 'completed')
      .flatMap((t) => t.expenses),
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `전체 (${trips.length})` },
    { key: 'completed', label: `완료 (${completedCount})` },
    { key: 'planned', label: `계획 중 (${plannedCount})` },
  ];

  // 로딩 상태
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-gray-400">여행 데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500">{error}</p>
        <p className="text-sm text-gray-400 mt-2">새로고침해주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 히어로 섹션 */}
      <section className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900">나의 여행 기록</h2>
        <p className="text-gray-500 mt-2">소중한 추억과 설레는 계획을 한곳에.</p>

        {/* 요약 통계 카드 */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-sm text-gray-500 mt-1">다녀온 여행</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{plannedCount}</p>
            <p className="text-sm text-gray-500 mt-1">계획 중</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalSpent)}
            </p>
            <p className="text-sm text-gray-500 mt-1">총 여행 경비</p>
          </div>
        </div>
      </section>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 여행 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">아직 여행이 없어요</p>
          <p className="text-sm mt-1">새로운 여행을 추가해보세요!</p>
        </div>
      )}
    </div>
  );
}
