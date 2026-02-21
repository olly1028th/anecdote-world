import { useState, lazy, Suspense } from 'react';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import { useFavoritePhotos, type FavoritePhoto } from '../hooks/useFavoritePhotos';

const WorldMap = lazy(() =>
  import('../components/Map').then((m) => ({ default: m.WorldMap })),
);

type PinFilter = 'all' | VisitStatus;

export default function HomePage() {
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const { trips, loading, error } = useTrips();
  const { pins, loading: pinsLoading } = usePins();
  const { photos: favoritePhotos, loading: favLoading } = useFavoritePhotos();

  const filteredPins =
    pinFilter === 'all' ? pins : pins.filter((p) => p.visit_status === pinFilter);

  const completedCount = trips.filter((t) => t.status === 'completed').length;
  const plannedCount = trips.filter((t) => t.status === 'planned').length;

  // favorite 사진을 여행지별로 그룹핑 (시간순)
  const photosByTrip = favoritePhotos.reduce<Record<string, FavoritePhoto[]>>((acc, photo) => {
    const key = photo.tripTitle || '기타';
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});
  // 그룹 순서: 각 그룹의 첫 사진 날짜 기준 시간순
  const tripGroups = Object.entries(photosByTrip).sort(
    ([, a], [, b]) => new Date(a[0].date).getTime() - new Date(b[0].date).getTime(),
  );

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
            <span className="block text-xl">📍</span>
            <span className="block text-xs font-bold mt-1">{pins.length} 핀</span>
          </div>
        </div>
      </section>

      {/* My Shiny Journal — Favorite 사진 액자 갤러리 */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-bold text-[#2D3436]">My Shiny Journal</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6]" />
        </div>

        {favLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-400">사진을 불러오는 중...</div>
          </div>
        ) : favoritePhotos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">🖼️</p>
            <p className="text-base font-medium">아직 대표 사진이 없어요</p>
            <p className="text-sm mt-1">여행지 상세에서 사진을 즐겨찾기로 지정해보세요!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tripGroups.map(([tripTitle, photos]) => (
              <div key={tripTitle}>
                {/* 여행지 라벨 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-[#FF6B6B]">{tripTitle}</span>
                  <span className="text-xs text-gray-400">{photos[0].destination}</span>
                </div>

                {/* 액자 가로 스크롤 */}
                <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="snap-start shrink-0 w-[200px]"
                    >
                      {/* 액자 프레임 */}
                      <div className="bg-white p-2 rounded-lg shadow-md shadow-gray-200/60 border border-gray-100">
                        <div className="relative aspect-[4/3] rounded overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* 캡션 영역 */}
                        <div className="mt-2 px-1 pb-1">
                          <p className="text-xs font-medium text-[#2D3436] truncate">
                            {photo.caption}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(photo.date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
