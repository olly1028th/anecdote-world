import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import { usePendingInvitations, acceptShare, declineShare } from '../hooks/useShares';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/format';
import { getCountryFlagUrl } from '../utils/countryFlag';
import TripCard from '../components/TripCard';

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
  const { user } = useAuth();
  const { invitations } = usePendingInvitations(user?.email ?? undefined);

  const handleAcceptInvitation = async (shareId: string) => {
    try {
      await acceptShare(shareId, user?.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '수락 실패');
    }
  };

  const handleDeclineInvitation = async (shareId: string) => {
    try {
      await declineShare(shareId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '거절 실패');
    }
  };
  const filteredPins =
    pinFilter === 'all' ? pins : pins.filter((p) => p.visit_status === pinFilter);

  const completedTrips = trips.filter((t) => t.status === 'completed');
  const plannedTrips = trips.filter((t) => t.status === 'planned');

  const pinFilters: { key: PinFilter; label: string }[] = [
    { key: 'all', label: `전체 (${pins.length})` },
    { key: 'visited', label: `방문 (${pins.filter((p) => p.visit_status === 'visited').length})` },
    { key: 'planned', label: `계획 (${pins.filter((p) => p.visit_status === 'planned').length})` },
    { key: 'wishlist', label: `위시 (${pins.filter((p) => p.visit_status === 'wishlist').length})` },
  ];

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#f43f5e] font-bold">{error}</p>
        <p className="text-sm text-[#1c140d]/40 mt-2 font-medium">새로고침해주세요.</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-8 pb-24">
      {/* Welcome Section */}
      <section className="pt-4">
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Mission Control</p>
        <h2 className="text-3xl font-bold leading-tight text-[#1c140d] dark:text-slate-100">Welcome back, Commander.</h2>
      </section>

      {/* 받은 초대 알림 */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#f43f5e] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{invitations.length}</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">새로운 초대가 도착했습니다</p>
          </div>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-[#0d9488] retro-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {inv.trip_title || '여행 초대'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {inv.owner_nickname || '사용자'}님이 {inv.permission === 'edit' ? '편집' : '읽기'} 권한으로 초대했습니다
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAcceptInvitation(inv.id)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#0d9488] border-2 border-slate-900 cursor-pointer hover:bg-[#0d9488]/90 transition-colors"
                >
                  수락
                </button>
                <button
                  onClick={() => handleDeclineInvitation(inv.id)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border-2 border-slate-900 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'completed' ? null : 'completed')}
          className={`border-2 border-[#eab308] rounded-xl p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'completed' ? 'bg-[#eab308]/30 -translate-y-1' : 'bg-[#eab308]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#eab308]">{completedTrips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">정복 완료</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'planned' ? null : 'planned')}
          className={`border-2 border-[#0d9488] rounded-xl p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'planned' ? 'bg-[#0d9488]/30 -translate-y-1' : 'bg-[#0d9488]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#0d9488]">{plannedTrips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">정복 예정</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'pins' ? null : 'pins')}
          className={`border-2 border-[#f43f5e] rounded-xl p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'pins' ? 'bg-[#f43f5e]/30 -translate-y-1' : 'bg-[#f43f5e]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#f43f5e]">{pins.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">Stars</span>
        </button>
      </section>

      {/* Expanded list panels */}
      {activeStatsTab && (
        <section className="bg-white dark:bg-slate-900 border-[3px] border-slate-900 dark:border-slate-700 rounded-xl p-4 retro-shadow">
          {activeStatsTab === 'completed' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Visited Planets</h3>
              {completedTrips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">완료된 여행이 없습니다.</p>
              ) : (
                completedTrips.map((trip) => {
                  const thumbSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 160);
                  return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-[#eab308]/20 flex items-center justify-center">
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={trip.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🌍</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                        {trip.destination && <span>{trip.destination} · </span>}
                        {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <span className="text-slate-300 text-lg font-bold shrink-0">›</span>
                  </Link>
                  );
                })
              )}
            </div>
          )}

          {activeStatsTab === 'planned' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Planned Missions</h3>
              {plannedTrips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">계획 중인 여행이 없습니다.</p>
              ) : (
                plannedTrips.map((trip) => {
                  const thumbSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 160);
                  return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-[#0d9488]/20 flex items-center justify-center">
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={trip.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🌍</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                        {trip.destination && <span>{trip.destination} · </span>}
                        {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <span className="text-slate-300 text-lg font-bold shrink-0">›</span>
                  </Link>
                  );
                })
              )}
            </div>
          )}

          {activeStatsTab === 'pins' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">All Pins</h3>
              {pins.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">등록된 핀이 없습니다.</p>
              ) : (
                pins.map((pin) => {
                  const pinTrip = pin.trip_id ? trips.find((t) => t.id === pin.trip_id) : null;
                  const statusLabels: Record<string, string> = { visited: 'Visited', planned: 'Planned', wishlist: 'Wish' };
                  const statusBg: Record<string, string> = { visited: 'bg-[#0d9488] text-white', planned: 'bg-[#eab308]', wishlist: 'bg-[#f43f5e] text-white' };
                  return (
                    <Link
                      key={pin.id}
                      to={pinTrip ? `/trip/${pinTrip.id}` : `/pin/edit/${pin.id}`}
                      className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#f43f5e]/10 border-2 border-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-lg">📍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{pin.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                          {pin.city && <span>{pin.city}</span>}
                          {pin.country && <span>, {pin.country}</span>}
                          {pinTrip && <span> · {pinTrip.title}</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border-2 border-slate-900 uppercase tracking-wider ${statusBg[pin.visit_status] || ''}`}>
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
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Galaxy Map</p>
        <h3 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100 mb-4">Explore the Universe</h3>
        <div className="relative h-[380px] rounded-xl overflow-hidden border-[3px] border-slate-900 retro-shadow">
          {pinsLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-[#F9F4E8]">
              <div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading map...</div>
            </div>
          ) : (
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-[#F9F4E8]"><div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading map...</div></div>}>
              <WorldMap pins={filteredPins} />
            </Suspense>
          )}

          {/* 핀 필터 오버레이 */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-[10]">
            {pinFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setPinFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-2 border-slate-900 ${
                  pinFilter === f.key
                    ? 'bg-[#f48c25] text-white'
                    : 'bg-white text-slate-900 hover:bg-[#f48c25]/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 범례 */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3 z-[10] bg-white rounded-full px-4 py-2 border-2 border-slate-900">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#0d9488] inline-block border border-slate-900" /> 방문
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block border border-slate-900" /> 계획
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#6366f1] inline-block border border-slate-900" /> 위시
            </span>
          </div>
        </div>
      </section>

      {/* Favorite Moments — 정복 완료된 여행만 카드로 표시 */}
      <section>
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Life Journey</p>
        <h3 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100 mb-4">Favorite Moments</h3>

        {completedTrips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🌍</p>
            <p className="text-base font-bold text-slate-400">아직 정복한 행성이 없어요</p>
            <p className="text-xs font-medium text-slate-300 mt-1">여행을 완료하면 이곳에 기록됩니다!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {completedTrips.map((trip, i) => (
              <TripCard key={trip.id} trip={trip} colorIndex={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
