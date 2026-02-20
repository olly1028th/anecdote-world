import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TripStatus } from '../types/trip';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import TripCard from '../components/TripCard';
import { WorldMap } from '../components/Map';
import { formatCurrency, totalExpenses } from '../utils/format';

type Filter = 'all' | TripStatus;
type View = 'list' | 'map';
type PinFilter = 'all' | VisitStatus;

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>('list');
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

  const pinFilters: { key: PinFilter; label: string; color: string }[] = [
    { key: 'all', label: `전체 (${pins.length})`, color: 'bg-blue-600' },
    { key: 'visited', label: `방문 (${pins.filter((p) => p.visit_status === 'visited').length})`, color: 'bg-emerald-600' },
    { key: 'planned', label: `계획 (${pins.filter((p) => p.visit_status === 'planned').length})`, color: 'bg-amber-500' },
    { key: 'wishlist', label: `위시 (${pins.filter((p) => p.visit_status === 'wishlist').length})`, color: 'bg-indigo-500' },
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

      {/* 뷰 전환 토글 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {view === 'list'
            ? tripFilters.map((f) => (
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
              ))
            : pinFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPinFilter(f.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    pinFilter === f.key
                      ? `${f.color} text-white`
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
        </div>

        {/* 지도/목록 토글 */}
        <div className="flex bg-white rounded-lg overflow-hidden shadow-sm">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              view === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 목록 뷰 */}
      {view === 'list' && (
        <>
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
        </>
      )}

      {/* 지도 뷰 */}
      {view === 'map' && (
        <div className="h-[500px] rounded-xl overflow-hidden shadow-sm">
          {pinsLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-white">
              <div className="animate-pulse text-gray-400">지도를 불러오는 중...</div>
            </div>
          ) : (
            <WorldMap pins={filteredPins} />
          )}
        </div>
      )}

      {/* 지도 뷰 범례 */}
      {view === 'map' && !pinsLoading && (
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> 방문
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 계획
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> 위시리스트
          </span>
          <span className="text-gray-400 ml-auto">
            핀 {filteredPins.length}개
          </span>
        </div>
      )}

      {/* FAB 추가 버튼 */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end">
        <Link
          to="/pin/new"
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg transition-colors no-underline text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          핀 추가
        </Link>
        <Link
          to="/trip/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-colors no-underline text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          여행 추가
        </Link>
      </div>
    </div>
  );
}
