import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReceivedShares, leaveShare } from '../hooks/useShares';
import { useToast } from '../contexts/ToastContext';
import { getCountryFlagUrl } from '../utils/countryFlag';
import { formatDate } from '../utils/format';
import type { TripStatus } from '../types/trip';

export default function SharedViewPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { shares, loading } = useReceivedShares(user?.email ?? undefined);

  // 해당 소유자의 공유 여행만 필터
  const ownerShares = useMemo(
    () => shares.filter((s) => s.owner_id === ownerId),
    [shares, ownerId],
  );

  const ownerNickname = ownerShares[0]?.owner_nickname ?? '사용자';

  // 상태별 분류
  const statusGroups = useMemo(() => {
    const completed = ownerShares.filter((s) => s.trip_status === 'completed');
    const planned = ownerShares.filter((s) => s.trip_status === 'planned');
    const wishlist = ownerShares.filter((s) => s.trip_status === 'wishlist');
    return { completed, planned, wishlist };
  }, [ownerShares]);

  const handleLeave = async () => {
    if (!ownerId) return;
    try {
      await leaveShare(ownerId);
      toast('공유가 해제되었습니다');
      navigate('/profile');
    } catch (err) {
      toast(err instanceof Error ? err.message : '공유 해제 실패', 'error');
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (ownerShares.length === 0) {
    return (
      <div className="px-6 py-20 text-center space-y-4">
        <p className="text-3xl">🔗</p>
        <p className="text-sm font-bold text-slate-400">공유된 여행이 없습니다</p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="text-[#f48c25] text-sm font-bold uppercase tracking-wider hover:underline bg-transparent border-0 cursor-pointer"
        >
          프로필로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-24">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 pt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#f48c25] transition-colors bg-transparent border-0 p-0 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* 소유자 프로필 헤더 */}
      <section className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-[#0d9488] retro-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0d9488] flex items-center justify-center">
              <span className="text-white text-lg font-bold">{ownerNickname[0].toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1c140d] dark:text-slate-100">{ownerNickname}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {ownerShares.length}개 여행 공유됨
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLeave}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#f43f5e] cursor-pointer border-2 border-slate-300 dark:border-slate-600 hover:border-[#f43f5e] px-3 py-1.5 rounded-full transition-colors bg-transparent"
          >
            공유 해제
          </button>
        </div>
      </section>

      {/* 간략 통계 */}
      <section className="grid grid-cols-3 gap-2">
        <div className="border-2 border-[#0d9488] rounded-xl p-3 flex flex-col items-center text-center bg-[#0d9488]/10">
          <span className="text-xl font-bold text-[#0d9488]">{statusGroups.completed.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">완료</span>
        </div>
        <div className="border-2 border-[#eab308] rounded-xl p-3 flex flex-col items-center text-center bg-[#eab308]/10">
          <span className="text-xl font-bold text-[#eab308]">{statusGroups.planned.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">예정</span>
        </div>
        <div className="border-2 border-[#6366f1] rounded-xl p-3 flex flex-col items-center text-center bg-[#6366f1]/10">
          <span className="text-xl font-bold text-[#6366f1]">{statusGroups.wishlist.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 leading-none">위시</span>
        </div>
      </section>

      {/* 여행 목록 */}
      {renderGroup('Visited Planets', statusGroups.completed, 'completed')}
      {renderGroup('Planned Missions', statusGroups.planned, 'planned')}
      {renderGroup('Wishlist', statusGroups.wishlist, 'wishlist')}
    </div>
  );
}

function renderGroup(
  title: string,
  shares: { id: string; trip_id: string; trip_title: string; trip_destination: string; trip_cover: string; trip_start_date?: string; permission: string }[],
  status: TripStatus,
) {
  if (shares.length === 0) return null;

  const statusBorder: Record<string, string> = {
    completed: 'border-[#0d9488]',
    planned: 'border-[#eab308]',
    wishlist: 'border-[#6366f1]',
  };
  const statusBadge: Record<string, string> = {
    completed: 'bg-[#0d9488] text-white',
    planned: 'bg-[#eab308] text-slate-900',
    wishlist: 'bg-[#6366f1] text-white',
  };
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[status]}`}>
          {shares.length}
        </span>
        <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
      </div>
      <div className="space-y-2">
        {shares.map((share) => {
          const thumbSrc = share.trip_cover || getCountryFlagUrl(share.trip_destination, 160);
          return (
            <Link
              key={share.id}
              to={`/trip/${share.trip_id}`}
              className={`flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border-2 ${statusBorder[status]} hover:border-[#f48c25] transition-colors no-underline`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border-[3px] border-slate-900 bg-slate-100 flex items-center justify-center">
                {thumbSrc ? (
                  <img src={thumbSrc} alt={share.trip_title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🌍</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{share.trip_title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                  {share.trip_destination && <span>{share.trip_destination}</span>}
                  {share.trip_start_date && <span> · {formatDate(share.trip_start_date)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {share.permission === 'edit' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f48c25]/15 text-[#f48c25]">편집</span>
                )}
                <span className="text-slate-300 text-lg font-bold">›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
