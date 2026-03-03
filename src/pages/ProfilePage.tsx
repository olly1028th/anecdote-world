import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../hooks/useProfile';
import { useStats } from '../hooks/useStats';
import { useReceivedShares, useSharedUsers, usePendingInvitations, acceptShare, declineShare, leaveShare } from '../hooks/useShares';
import { formatCurrency, formatDate } from '../utils/format';
import { getCountryFlagUrl } from '../utils/countryFlag';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, isDemo } = useAuth();
  const { toast } = useToast();
  const { updating, error: profileError, updateProfile } = useProfile();
  const stats = useStats();
  const { shares: receivedShares, loading: sharesLoading } = useReceivedShares(user?.email ?? undefined);
  const { users: sharedUsers } = useSharedUsers(user?.id);
  const { invitations: pendingInvitations } = usePendingInvitations(user?.email ?? undefined);

  const handleAcceptInvitation = async (shareId: string) => {
    try {
      await acceptShare(shareId, user?.id);
      toast('초대를 수락했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '수락 실패', 'error');
    }
  };

  const handleDeclineInvitation = async (shareId: string) => {
    try {
      await declineShare(shareId);
      toast('초대를 거절했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '거절 실패', 'error');
    }
  };

  // Confirm modal for leave share
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const handleLeaveShare = (ownerId: string, ownerNickname: string) => {
    setConfirmModal({
      open: true,
      title: '공유 해제',
      message: `${ownerNickname}님의 공유를 해제하시겠습니까? 해당 사용자의 모든 여행이 더 이상 표시되지 않습니다.`,
      confirmLabel: '공유 해제',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        try {
          await leaveShare(ownerId);
          toast('공유가 해제되었습니다');
        } catch (err) {
          toast(err instanceof Error ? err.message : '공유 해제 실패', 'error');
        }
      },
    });
  };

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  // 편집 시작
  const handleEdit = () => {
    setNickname(profile?.nickname ?? '');
    setBio(profile?.bio ?? '');
    setEditing(true);
  };

  // 저장
  const handleSave = async () => {
    if (isDemo) {
      toast('데모 모드에서는 저장할 수 없습니다.', 'info');
      return;
    }
    await updateProfile({ nickname: nickname.trim(), bio: bio.trim() });
    setEditing(false);
    toast('프로필이 저장되었습니다');
  };

  // 취소
  const handleCancel = () => {
    setEditing(false);
  };

  // 이니셜 생성
  const initials = (profile?.nickname ?? '?').slice(0, 2).toUpperCase();

  // pinsByStatus 합계
  const totalPins =
    stats.pinsByStatus.visited +
    stats.pinsByStatus.planned +
    stats.pinsByStatus.wishlist;

  // 로딩 상태
  if (stats.loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-gray-400">프로필을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 space-y-6 sm:space-y-8 pb-24">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#f48c25] transition-colors bg-transparent border-0 p-0 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* ── 프로필 헤더 ── */}
      <section className="bg-white dark:bg-[#2a1f15] rounded-xl p-6 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow">
        <div className="flex items-start gap-5">
          {/* 아바타 */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0 ring-4 ring-[#FFD166]/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#FFD166] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md">
              {initials}
            </div>
          )}

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0">
            {editing ? (
              /* ── 편집 모드 ── */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                    닉네임
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    className="w-full border-[3px] border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] bg-white dark:bg-[#1a1208] dark:text-slate-100"
                    placeholder="닉네임을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                    소개
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="w-full border-[3px] border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none bg-white dark:bg-[#1a1208] dark:text-slate-100"
                    placeholder="간단한 소개를 적어주세요"
                  />
                </div>

                {profileError && (
                  <p className="text-[#FF6B6B] text-xs">{profileError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updating}
                    className="px-4 py-2 bg-[#f48c25] text-white text-xs font-bold uppercase tracking-widest rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#d97a1e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="px-4 py-2 bg-white dark:bg-[#1a1208] text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest rounded-xl border-2 border-slate-900 dark:border-slate-100 hover:bg-gray-50 dark:hover:bg-[#2a1f15] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── 읽기 모드 ── */
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#1c140d] dark:text-slate-100 truncate">
                    {profile?.nickname || '여행자'}
                  </h1>
                  {isDemo && (
                    <span className="px-2 py-0.5 bg-[#FFD166]/20 text-[#FF9F43] text-xs font-medium rounded-full">
                      Demo
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {profile?.bio || '아직 소개가 없습니다.'}
                </p>

                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                  가입일:{' '}
                  {profile?.created_at
                    ? formatDate(profile.created_at)
                    : '-'}
                </p>

                <button
                  onClick={handleEdit}
                  className="mt-3 px-4 py-2 bg-white dark:bg-[#1a1208] text-slate-500 dark:text-slate-300 text-xs font-bold uppercase tracking-widest rounded-xl border-2 border-slate-900 dark:border-slate-100 hover:bg-[#f48c25]/10 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 나의 통계 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1c140d] dark:text-slate-100">나의 통계</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <span className="block text-xl mb-1">✈️</span>
            <p className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
              {stats.completedCount}
            </p>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-1">다녀온 여행</p>
          </div>

          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <span className="block text-xl mb-1">🌍</span>
            <p className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
              {stats.countriesVisited.length}
            </p>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-1">방문 국가</p>
          </div>

          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <span className="block text-xl mb-1">💰</span>
            <p className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
              {formatCurrency(stats.totalSpent)}
            </p>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-1">총 경비</p>
          </div>

          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <span className="block text-xl mb-1">📍</span>
            <p className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">{totalPins}</p>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-1">등록한 핀</p>
          </div>

          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <span className="block text-xl mb-1">📸</span>
            <p className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
              {stats.totalPhotos}
            </p>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-1">촬영한 사진</p>
          </div>
        </div>
      </section>

      {/* ── 방문 국가 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1c140d] dark:text-slate-100">방문 국가</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
        </div>

        <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-6 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow">
          {stats.countriesVisited.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.countriesVisited.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center px-3 py-1.5 bg-[#FFD166]/15 text-[#FF9F43] text-sm font-medium rounded-full"
                >
                  {country}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 dark:text-slate-500 py-4">
              아직 방문한 국가가 없어요
            </p>
          )}
        </div>
      </section>

      {/* ── 대기 중인 초대 ── */}
      {pendingInvitations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#1c140d] dark:text-slate-100">대기 중인 초대</h2>
            <span className="px-2 py-0.5 bg-[#f43f5e]/15 text-[#f43f5e] text-xs font-bold rounded-full animate-pulse">
              {pendingInvitations.length}
            </span>
            <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
          </div>

          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 bg-white dark:bg-[#2a1f15] p-4 rounded-xl border-[3px] border-[#f43f5e] retro-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1c140d] dark:text-slate-100 truncate">
                    {inv.trip_title || '여행 초대'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                    {inv.owner_nickname || '사용자'}님이 {inv.permission === 'edit' ? '편집' : '읽기'} 권한으로 초대
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0d9488] hover:bg-[#0d9488]/90 transition-colors cursor-pointer border-0"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 bg-gray-100 dark:bg-[#1a1208] hover:bg-gray-200 dark:hover:bg-[#2a1f15] transition-colors cursor-pointer border-0"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 공유받은 여행 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1c140d] dark:text-slate-100">공유받은 여행</h2>
          {receivedShares.length > 0 && (
            <span className="px-2 py-0.5 bg-[#0d9488]/15 text-[#0d9488] text-xs font-bold rounded-full">
              {receivedShares.length}
            </span>
          )}
          <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
        </div>

        {sharesLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-gray-400 text-sm">불러오는 중...</div>
          </div>
        ) : receivedShares.length > 0 ? (
          <div className="space-y-5">
            {/* 소유자별 그룹핑 */}
            {(() => {
              const ownerGroups = new Map<string, typeof receivedShares>();
              for (const share of receivedShares) {
                const key = share.owner_id;
                if (!ownerGroups.has(key)) ownerGroups.set(key, []);
                ownerGroups.get(key)!.push(share);
              }
              return [...ownerGroups.entries()].map(([ownerId, ownerShares]) => {
                const ownerNickname = ownerShares[0].owner_nickname;
                const permission = ownerShares.some((s) => s.permission === 'edit') ? 'edit' : 'read';
                return (
                  <div key={ownerId} className="space-y-2">
                    {/* 소유자 헤더 — 클릭하면 공유 뷰 페이지로 이동 */}
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/shared/${ownerId}`}
                        className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#0d9488] flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{ownerNickname[0].toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ownerNickname}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          permission === 'edit'
                            ? 'bg-[#f48c25]/15 text-[#f48c25]'
                            : 'bg-[#0d9488]/15 text-[#0d9488]'
                        }`}>
                          {permission === 'edit' ? '편집' : '읽기'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-500 ml-1">{ownerShares.length}개 ›</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleLeaveShare(ownerId, ownerNickname)}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#f43f5e] cursor-pointer border-2 border-slate-300 dark:border-slate-600 hover:border-[#f43f5e] px-2.5 py-1 rounded-full transition-colors bg-transparent"
                      >
                        공유 해제
                      </button>
                    </div>
                    {/* 해당 소유자의 최근 2개 여행 미리보기 */}
                    {ownerShares.slice(0, 2).map((share) => {
                      const coverSrc = share.trip_cover || getCountryFlagUrl(share.trip_destination, 160);
                      return (
                        <Link
                          key={share.id}
                          to={`/trip/${share.trip_id}`}
                          className="flex items-center gap-3 bg-white dark:bg-[#2a1f15] p-4 rounded-xl border-[3px] border-slate-900 dark:border-slate-100 retro-shadow no-underline hover:border-[#f48c25] transition-all"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#0d9488]/10">
                            {coverSrc ? (
                              <img src={coverSrc} alt={share.trip_title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🌍</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#1c140d] dark:text-slate-100 truncate">{share.trip_title}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                              {share.trip_destination || '여행'}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })}
                    {/* 3개 이상이면 "모두 보기" 링크 */}
                    {ownerShares.length > 2 && (
                      <Link
                        to={`/shared/${ownerId}`}
                        className="block text-center py-2 text-[10px] font-bold uppercase tracking-widest text-[#0d9488] hover:text-[#f48c25] transition-colors no-underline"
                      >
                        {ownerNickname}님의 여행 모두 보기 ({ownerShares.length}개) ›
                      </Link>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-8 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow text-center">
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 font-medium">공유받은 여행이 없습니다</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">다른 사용자가 여행을 공유하면 여기에 표시됩니다</p>
          </div>
        )}
      </section>

      {/* ── 내가 공유한 여행 ── */}
      {sharedUsers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#1c140d] dark:text-slate-100">내가 공유한 크루</h2>
            <span className="px-2 py-0.5 bg-[#f48c25]/15 text-[#f48c25] text-xs font-bold rounded-full">
              {sharedUsers.length}
            </span>
            <div className="h-[2px] flex-1 bg-[#F0EEE6] dark:bg-[#4a3f35]" />
          </div>

          <div className="bg-white dark:bg-[#2a1f15] rounded-xl p-5 border-[3px] border-slate-900 dark:border-slate-100 retro-shadow space-y-3">
            {sharedUsers.map((su) => (
              <div
                key={su.email}
                className="flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  su.status === 'accepted' ? 'bg-[#0d9488] text-white' : 'bg-[#eab308] text-slate-900'
                }`}>
                  {su.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1c140d] dark:text-slate-100 truncate">{su.email}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                    {su.tripCount}개 여행 · {su.permission === 'edit' ? '편집' : '읽기'}
                    {su.status === 'pending' && ' · 수락 대기중'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  su.status === 'accepted'
                    ? 'bg-[#0d9488]/15 text-[#0d9488]'
                    : 'bg-[#eab308]/15 text-[#eab308]'
                }`}>
                  {su.status === 'accepted' ? '수락됨' : '대기중'}
                </span>
              </div>
            ))}
          </div>
        </section>
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
