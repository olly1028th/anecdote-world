import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { VisitStatus } from '../types/database';
import { useTrips } from '../hooks/useTrips';
import { usePins } from '../hooks/usePins';
import { useFavoritePhotos } from '../hooks/useFavoritePhotos';
import { usePendingInvitations, acceptSharesFromOwner, declineSharesFromOwner, shareAllTrips, revokeAllShares, useSharedUsers } from '../hooks/useShares';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/format';
import { getCountryFlagUrl } from '../utils/countryFlag';
import { getMapDisplayPins } from '../utils/mapPins';
import ConfirmModal from '../components/ConfirmModal';
import { HomePageSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import SearchFilter from '../components/SearchFilter';
import type { SharePermission } from '../types/database';
import type { TripStatus } from '../types/trip';


const WorldMap = lazy(() =>
  import('../components/Map').then((m) => ({ default: m.WorldMap })),
);

type PinFilter = 'all' | VisitStatus;
type StatsTab = 'completed' | 'planned' | 'wishlist' | 'pins' | null;

export default function HomePage() {
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');
  const [activeStatsTab, setActiveStatsTab] = useState<StatsTab>(null);
  const { trips, loading, error } = useTrips();
  const { pins, loading: pinsLoading } = usePins();
  const { user } = useAuth();
  const { photos: favoritePhotos, loading: favLoading } = useFavoritePhotos();
  const { toast } = useToast();
  const { invitations } = usePendingInvitations(user?.email ?? undefined);
  const { users: sharedUsers } = useSharedUsers(user?.id);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<SharePermission>('read');
  const [inviting, setInviting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Supabase 연결 실패 시 사용자에게 알림
  useEffect(() => {
    if (error) {
      toast(error, 'error');
    }
  }, [error, toast]);

  const handleAcceptInvitation = async (shareIds: string[]) => {
    try {
      await acceptSharesFromOwner(shareIds, user?.id);
      toast('초대를 수락했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '수락 실패', 'error');
    }
  };

  const handleDeclineInvitation = async (shareIds: string[]) => {
    try {
      await declineSharesFromOwner(shareIds);
      toast('초대를 거절했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '거절 실패', 'error');
    }
  };
  const handleShareAll = async () => {
    if (!inviteEmail.trim() || !user) return;
    try {
      setInviting(true);
      const tripIds = trips.map((t) => t.id);
      const tripTitles = new Map(trips.map((t) => [t.id, t.title]));
      const count = await shareAllTrips(user.id, tripIds, inviteEmail.trim(), invitePermission, tripTitles);
      setInviteEmail('');
      toast(count > 0 ? `${count}개 여행이 공유되었습니다` : '이미 모든 여행이 공유되어 있습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '공유 실패', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeAll = (email: string) => {
    setConfirmModal({
      open: true,
      title: '공유 취소',
      message: `${email}에게 공유된 모든 여행을 취소하시겠습니까?`,
      confirmLabel: '취소하기',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        if (!user) return;
        try {
          await revokeAllShares(user.id, email);
          toast('공유가 취소되었습니다');
        } catch (err) {
          toast(err instanceof Error ? err.message : '공유 취소 실패', 'error');
        }
      },
    });
  };

  // 검색 & 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');

  // 세계지도에 표시할 핀: 메인 핀만 (day_number 있는 일정 장소는 제외)
  const mapPins = useMemo(() => getMapDisplayPins(pins), [pins]);
  const filteredPins =
    pinFilter === 'all' ? mapPins : mapPins.filter((p) => p.visit_status === pinFilter);

  const completedTrips = trips.filter((t) => t.status === 'completed');
  const plannedTrips = trips.filter((t) => t.status === 'planned');
  const wishlistTrips = trips.filter((t) => t.status === 'wishlist');

  // 지도와 일치하는 핀 기반 카운트 (stats 카드에 사용)
  const visitedPinCount = mapPins.filter((p) => p.visit_status === 'visited').length;
  const plannedPinCount = mapPins.filter((p) => p.visit_status === 'planned').length;
  const wishlistPinCount = mapPins.filter((p) => p.visit_status === 'wishlist').length;

  // 검색/필터 적용된 여행 목록
  const displayTrips = useMemo(() => {
    let result = trips;
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.memo?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [trips, statusFilter, searchQuery]);

  const pinFilters = useMemo<{ key: PinFilter; label: string }[]>(() => [
    { key: 'all', label: `전체 (${mapPins.length})` },
    { key: 'visited', label: `방문 (${visitedPinCount})` },
    { key: 'planned', label: `계획 (${plannedPinCount})` },
    { key: 'wishlist', label: `위시 (${wishlistPinCount})` },
  ], [mapPins.length, visitedPinCount, plannedPinCount, wishlistPinCount]);

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 space-y-8 pb-24">
      {/* Welcome Section */}
      <section className="pt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Mission Control</p>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-[#1c140d] dark:text-slate-100">Welcome back, Commander.</h2>
        </div>
        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          className="shrink-0 w-11 h-11 rounded-xl bg-[#0d9488] hover:bg-[#0d9488]/90 text-white border-[3px] border-slate-900 retro-shadow flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:translate-x-0.5 relative"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {sharedUsers.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#f48c25] text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
              {sharedUsers.length}
            </span>
          )}
        </button>
      </section>

      {/* 받은 초대 알림 (소유자별 1개) */}
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
              key={inv.owner_id}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-[#0d9488] retro-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">{inv.owner_nickname[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {inv.owner_nickname}님의 초대
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {inv.tripCount}개 여행 · {inv.permission === 'edit' ? '편집' : '읽기'} 권한
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAcceptInvitation(inv.shareIds)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#0d9488] border-2 border-slate-900 cursor-pointer hover:bg-[#0d9488]/90 transition-colors"
                >
                  수락
                </button>
                <button
                  onClick={() => handleDeclineInvitation(inv.shareIds)}
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
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'completed' ? null : 'completed')}
          className={`border-2 border-[#0d9488] rounded-xl p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'completed' ? 'bg-[#0d9488]/30 -translate-y-1' : 'bg-[#0d9488]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#0d9488]">{completedTrips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">정복 완료</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'planned' ? null : 'planned')}
          className={`border-2 border-[#eab308] rounded-xl p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'planned' ? 'bg-[#eab308]/30 -translate-y-1' : 'bg-[#eab308]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#eab308]">{plannedTrips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">정복 예정</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'wishlist' ? null : 'wishlist')}
          className={`border-2 border-[#6366f1] rounded-xl p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'wishlist' ? 'bg-[#6366f1]/30 -translate-y-1' : 'bg-[#6366f1]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#6366f1]">{wishlistTrips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">위시</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatsTab(activeStatsTab === 'pins' ? null : 'pins')}
          className={`border-2 border-[#f43f5e] rounded-xl p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            activeStatsTab === 'pins' ? 'bg-[#f43f5e]/30 -translate-y-1' : 'bg-[#f43f5e]/10'
          }`}
        >
          <span className="text-2xl font-bold text-[#f43f5e]">{trips.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">Stars</span>
        </button>
      </section>

      {/* Expanded list panels — 스탯 카드 바로 아래 */}
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

          {activeStatsTab === 'wishlist' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Wishlist</h3>
              {wishlistTrips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">위시리스트가 비어있습니다.</p>
              ) : (
                wishlistTrips.map((trip) => {
                  const thumbSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 160);
                  return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-[#6366f1]/20 flex items-center justify-center">
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={trip.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🌍</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                        {trip.destination && <span>{trip.destination}</span>}
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">All Stars ({trips.length})</h3>
              {trips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">등록된 여행이 없습니다.</p>
              ) : (
                trips.map((trip) => {
                  const thumbSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 160);
                  const statusLabels: Record<string, string> = { completed: 'Visited', planned: 'Planned', wishlist: 'Wish' };
                  const statusBg: Record<string, string> = { completed: 'bg-[#0d9488] text-white', planned: 'bg-[#eab308]', wishlist: 'bg-[#f43f5e] text-white' };
                  return (
                    <Link
                      key={trip.id}
                      to={`/trip/${trip.id}`}
                      className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-[#f43f5e]/10 flex items-center justify-center">
                        {thumbSrc ? (
                          <img src={thumbSrc} alt={trip.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">🌍</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                          {trip.destination && <span>{trip.destination}</span>}
                          {trip.startDate && <span> · {formatDate(trip.startDate)}</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border-2 border-slate-900 uppercase tracking-wider ${statusBg[trip.status] || ''}`}>
                        {statusLabels[trip.status] || trip.status}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {/* 검색 & 필터 */}
      {trips.length > 0 && (
        <SearchFilter
          onSearch={setSearchQuery}
          onFilterChange={setStatusFilter}
          activeFilter={statusFilter}
          tripCounts={{
            all: trips.length,
            completed: completedTrips.length,
            planned: plannedTrips.length,
            wishlist: wishlistTrips.length,
          }}
        />
      )}

      {/* 검색 결과 */}
      {(searchQuery || statusFilter !== 'all') && (
        <section className="bg-white dark:bg-slate-900 border-[3px] border-slate-900 dark:border-slate-700 rounded-xl p-4 retro-shadow">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            Search Results ({displayTrips.length})
          </h3>
          {displayTrips.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="검색 결과가 없습니다"
              description="다른 키워드로 검색하거나 필터를 변경해보세요"
            />
          ) : (
            <div className="space-y-2">
              {displayTrips.map((trip) => {
                const thumbSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 160);
                const statusBadge = trip.status === 'completed'
                  ? 'bg-[#0d9488] text-white' : trip.status === 'planned'
                  ? 'bg-[#eab308] text-slate-900' : 'bg-[#6366f1] text-white';
                const statusLabel = trip.status === 'completed' ? 'Visited' : trip.status === 'planned' ? 'Planned' : 'Wish';
                return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#f48c25] transition-colors no-underline"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-slate-100 flex items-center justify-center">
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
                        {formatDate(trip.startDate)}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full border-2 border-slate-900 uppercase ${statusBadge}`}>
                      {statusLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 여행이 없을 때 빈 상태 */}
      {trips.length === 0 && !loading && (
        <EmptyState
          icon="🚀"
          title="아직 등록된 여행이 없어요"
          description="첫 번째 여행을 추가하고 세계 지도를 채워보세요!"
          actionLabel="+ 첫 여행 만들기"
          onAction={() => window.dispatchEvent(new CustomEvent('open-trip-modal'))}
        />
      )}

      {/* 세계지도 */}
      <section>
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Galaxy Map</p>
        <h3 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100 mb-4">Explore the Universe</h3>
        <div className="relative h-[260px] sm:h-[340px] md:h-[380px] rounded-xl overflow-hidden border-[3px] border-slate-900 retro-shadow">
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
          <div className="absolute top-3 left-3 right-3 sm:right-auto flex gap-1.5 z-[10] overflow-x-auto no-scrollbar">
            {pinFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setPinFilter(f.key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-2 border-slate-900 whitespace-nowrap shrink-0 ${
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
          <div className="absolute bottom-3 left-3 flex items-center gap-2 sm:gap-3 z-[10] bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-slate-900">
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

      {/* Favorite Moments — 완료된 여행 + 즐겨찾기 사진 통합 갤러리 */}
      <section>
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Life Journey</p>
        <h3 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100 mb-4">Favorite Moments</h3>

        {favLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
          </div>
        ) : favoritePhotos.length === 0 && completedTrips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🌍</p>
            <p className="text-base font-bold text-slate-400">아직 추억이 없어요</p>
            <p className="text-xs font-medium text-slate-300 mt-1">여행을 완료하거나 사진에서 하트를 눌러 추가해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* 완료된 여행 사진 카드 */}
            {completedTrips.map((trip) => {
              const coverSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 640);
              return (
                <Link
                  key={`trip-${trip.id}`}
                  to={`/trip/${trip.id}`}
                  className="relative group overflow-hidden rounded-xl border-[3px] border-slate-900 retro-shadow aspect-[4/3] no-underline block"
                >
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f48c25]/30 via-[#eab308]/20 to-[#0d9488]/30 flex items-center justify-center">
                      <span className="text-4xl">🌍</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-bold truncate">{trip.title}</p>
                    <p className="text-white/70 text-[10px] font-medium truncate">
                      {trip.destination}
                    </p>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#0d9488] text-white border border-slate-900 uppercase">
                      Visited
                    </span>
                  </div>
                </Link>
              );
            })}
            {/* 즐겨찾기 사진 */}
            {favoritePhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group overflow-hidden rounded-xl border-[3px] border-slate-900 retro-shadow aspect-[4/3]"
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs font-bold truncate">{photo.caption}</p>
                  <p className="text-white/70 text-[10px] font-medium truncate">
                    {photo.destination} · {photo.tripTitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 전체 공유 모달 */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShareModalOpen(false)}>
          <div
            className="bg-[#F9F4E8] dark:bg-[#1a1208] w-full max-w-md rounded-t-2xl sm:rounded-2xl border-[3px] border-slate-900 retro-shadow p-6 space-y-5 max-h-[85dvh] overflow-y-auto"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Share My Journey</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              이메일로 초대하면 내 모든 여행 기록({trips.length}개)을 공유할 수 있습니다.
            </p>

            {/* 초대 폼 */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Invite Crew</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleShareAll(); } }}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-sm font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
                />
                <select
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as SharePermission)}
                  className="w-20 shrink-0 px-2 py-2.5 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-xs font-bold bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
                >
                  <option value="read">읽기</option>
                  <option value="edit">편집</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleShareAll}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#0d9488] border-2 border-slate-900 retro-shadow hover:bg-[#0d9488]/90 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {inviting ? '초대 중...' : `전체 여행 공유 (${trips.length}개)`}
              </button>
            </div>

            {/* 공유된 사용자 목록 */}
            {sharedUsers.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Shared Crew</p>
                <div className="space-y-2">
                  {sharedUsers.map((su) => (
                    <div
                      key={su.email}
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#2a1f15] rounded-xl border-2 border-slate-200 dark:border-[#4a3f35]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          su.status === 'accepted' ? 'bg-[#0d9488] text-white' : 'bg-[#eab308] text-slate-900'
                        }`}>
                          {su.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{su.email}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {su.tripCount}개 여행 · {su.permission === 'edit' ? '편집' : '읽기'}
                            {su.status === 'pending' && ' · 수락 대기중'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeAll(su.email)}
                        className="text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0 p-1"
                        title="공유 취소"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sharedUsers.length === 0 && (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🚀</p>
                <p className="text-sm text-slate-400 font-medium">아직 공유한 크루가 없습니다</p>
                <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">이메일로 초대하여 여행을 함께 나눠보세요!</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
