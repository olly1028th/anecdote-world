import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import { useFavoritePhotos, type FavoritePhoto } from '../hooks/useFavoritePhotos';
import { formatDate } from '../utils/format';

const WorldMap = lazy(() =>
  import('../components/Map').then((m) => ({ default: m.WorldMap })),
);

type PinFilter = 'all' | VisitStatus;
type StatsTab = 'completed' | 'planned' | 'pins' | null;

export default function HomePage() {
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const [activeStatsTab, setActiveStatsTab] = useState<StatsTab>(null);
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
        <div className="animate-pulse text-[#2D3436]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#FF6B6B] font-bold">{error}</p>
        <p className="text-sm text-[#2D3436]/40 mt-2 font-medium">새로고침해주세요.</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-10">
      {/* Quick Stats — 레트로 대시보드 */}
      <section className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'completed' ? null : 'completed')}
          className={`border-4 border-[#2D3436] p-4 rounded-[24px] transition-all cursor-pointer ${
            activeStatsTab === 'completed'
              ? 'bg-[#4ECDC4] shadow-[6px_6px_0px_0px_#2D3436] -translate-y-1'
              : 'bg-[#4ECDC4]/80 shadow-[4px_4px_0px_0px_#2D3436]'
          }`}
        >
          <span className="block text-xl">✈️</span>
          <p className="text-[10px] font-black uppercase tracking-tight mt-1">Visited</p>
          <p className="text-2xl font-black mt-0.5">{completedCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'planned' ? null : 'planned')}
          className={`border-4 border-[#2D3436] p-4 rounded-[24px] transition-all cursor-pointer ${
            activeStatsTab === 'planned'
              ? 'bg-[#FFD166] shadow-[6px_6px_0px_0px_#2D3436] -translate-y-1'
              : 'bg-[#FFD166]/80 shadow-[4px_4px_0px_0px_#2D3436]'
          }`}
        >
          <span className="block text-xl">📋</span>
          <p className="text-[10px] font-black uppercase tracking-tight mt-1">Planned</p>
          <p className="text-2xl font-black mt-0.5">{plannedCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'pins' ? null : 'pins')}
          className={`border-4 border-[#2D3436] p-4 rounded-[24px] transition-all cursor-pointer ${
            activeStatsTab === 'pins'
              ? 'bg-[#FF6B6B] shadow-[6px_6px_0px_0px_#2D3436] -translate-y-1 text-white'
              : 'bg-[#FF6B6B]/80 shadow-[4px_4px_0px_0px_#2D3436]'
          }`}
        >
          <span className="block text-xl">📍</span>
          <p className="text-[10px] font-black uppercase tracking-tight mt-1">Pins</p>
          <p className="text-2xl font-black mt-0.5">{pins.length}</p>
        </button>
      </section>

      {/* Expanded list panels */}
      {activeStatsTab && (
        <section className="border-4 border-[#2D3436] rounded-[24px] p-4 bg-white shadow-[6px_6px_0px_0px_#2D3436]">
          {activeStatsTab === 'completed' && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-3">Visited Planets</h3>
              {trips.filter((t) => t.status === 'completed').length === 0 ? (
                <p className="text-sm text-[#2D3436]/40 text-center py-4 font-medium">완료된 여행이 없습니다.</p>
              ) : (
                trips.filter((t) => t.status === 'completed').map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] p-3 rounded-xl border-2 border-[#2D3436]/10 hover:border-[#2D3436]/30 transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 border-[#2D3436]">
                      <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#2D3436] truncate">{trip.title}</p>
                      <p className="text-[10px] text-[#2D3436]/40 mt-0.5 uppercase tracking-wider font-bold">
                        {trip.destination && <span>{trip.destination} · </span>}
                        {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <span className="text-[#2D3436]/20 text-lg font-black shrink-0">›</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeStatsTab === 'planned' && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-3">Planned Missions</h3>
              {trips.filter((t) => t.status === 'planned').length === 0 ? (
                <p className="text-sm text-[#2D3436]/40 text-center py-4 font-medium">계획 중인 여행이 없습니다.</p>
              ) : (
                trips.filter((t) => t.status === 'planned').map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] p-3 rounded-xl border-2 border-[#2D3436]/10 hover:border-[#2D3436]/30 transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 border-[#2D3436]">
                      <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#2D3436] truncate">{trip.title}</p>
                      <p className="text-[10px] text-[#2D3436]/40 mt-0.5 uppercase tracking-wider font-bold">
                        {trip.destination && <span>{trip.destination} · </span>}
                        {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <span className="text-[#2D3436]/20 text-lg font-black shrink-0">›</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeStatsTab === 'pins' && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-3">All Pins</h3>
              {pins.length === 0 ? (
                <p className="text-sm text-[#2D3436]/40 text-center py-4 font-medium">등록된 핀이 없습니다.</p>
              ) : (
                pins.map((pin) => {
                  const pinTrip = pin.trip_id ? trips.find((t) => t.id === pin.trip_id) : null;
                  const statusLabels: Record<string, string> = { visited: 'Visited', planned: 'Planned', wishlist: 'Wish' };
                  const statusBg: Record<string, string> = { visited: 'bg-[#4ECDC4]', planned: 'bg-[#FFD166]', wishlist: 'bg-[#6366f1] text-white' };
                  return (
                    <Link
                      key={pin.id}
                      to={pinTrip ? `/trip/${pinTrip.id}` : `/pin/edit/${pin.id}`}
                      className="flex items-center gap-3 bg-[#F9F4E8] p-3 rounded-xl border-2 border-[#2D3436]/10 hover:border-[#2D3436]/30 transition-colors no-underline"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#FF6B6B]/10 border-2 border-[#2D3436]/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">📍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[#2D3436] truncate">{pin.name}</p>
                        <p className="text-[10px] text-[#2D3436]/40 mt-0.5 uppercase tracking-wider font-bold">
                          {pin.city && <span>{pin.city}</span>}
                          {pin.country && <span>, {pin.country}</span>}
                          {pinTrip && <span> · {pinTrip.title}</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 border-2 border-[#2D3436] uppercase tracking-wider ${statusBg[pin.visit_status] || ''}`}>
                        {statusLabels[pin.visit_status] || pin.visit_status}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {/* 세계지도 */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#2D3436]">Galaxy Map</h2>
          <div className="h-[4px] flex-1 bg-[#2D3436] rounded-full" />
        </div>
        <div className="relative h-[380px] rounded-[24px] overflow-hidden border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_#2D3436]">
          {pinsLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-[#F9F4E8]">
              <div className="animate-pulse text-[#2D3436]/40 font-bold uppercase tracking-widest text-sm">Loading map...</div>
            </div>
          ) : (
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-[#F9F4E8]"><div className="animate-pulse text-[#2D3436]/40 font-bold uppercase tracking-widest text-sm">Loading map...</div></div>}>
              <WorldMap pins={filteredPins} />
            </Suspense>
          )}

          {/* 핀 필터 오버레이 */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-[1000]">
            {pinFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setPinFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-[#2D3436] ${
                  pinFilter === f.key
                    ? 'bg-[#FF6B6B] text-white shadow-[2px_2px_0px_0px_#2D3436]'
                    : 'bg-white text-[#2D3436] hover:bg-[#FFD166]/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 범례 오버레이 */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3 z-[1000] bg-white rounded-full px-4 py-2 border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436]">
            <span className="flex items-center gap-1 text-[10px] font-black text-[#2D3436] uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#059669] inline-block border border-[#2D3436]" /> 방문
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black text-[#2D3436] uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#d97706] inline-block border border-[#2D3436]" /> 계획
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black text-[#2D3436] uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#6366f1] inline-block border border-[#2D3436]" /> 위시
            </span>
          </div>
        </div>
      </section>

      {/* Life Journey — Favorite 사진 액자 갤러리 */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#2D3436]">Life Journey</h2>
          <div className="h-[4px] flex-1 bg-[#2D3436] rounded-full" />
        </div>

        {favLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-[#2D3436]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
          </div>
        ) : favoritePhotos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🖼️</p>
            <p className="text-base font-black text-[#2D3436]/40">아직 대표 사진이 없어요</p>
            <p className="text-xs font-medium text-[#2D3436]/30 mt-1">여행지 상세에서 사진을 즐겨찾기로 지정해보세요!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tripGroups.map(([tripTitle, photos]) => (
              <div key={tripTitle}>
                {/* 여행지 라벨 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-black text-[#FF6B6B] uppercase tracking-tight">{tripTitle}</span>
                  <span className="text-[10px] text-[#2D3436]/40 font-bold uppercase tracking-wider">{photos[0].destination}</span>
                </div>

                {/* 액자 가로 스크롤 */}
                <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="snap-start shrink-0 w-[200px]"
                    >
                      {/* 액자 프레임 — 레트로 스타일 */}
                      <div className="bg-white p-2 rounded-xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_#2D3436]">
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#2D3436]/10">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* 캡션 영역 */}
                        <div className="mt-2 px-1 pb-1">
                          <p className="text-xs font-bold text-[#2D3436] truncate">
                            {photo.caption}
                          </p>
                          <p className="text-[10px] text-[#2D3436]/40 mt-0.5 font-medium uppercase tracking-wider">
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
