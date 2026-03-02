import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePendingInvitations, acceptShare, declineShare } from '../hooks/useShares';

export default function Header() {
  const { user, profile, isDemo, signOut } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { toast } = useToast();
  const { invitations } = usePendingInvitations(user?.email ?? undefined);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  const handleAccept = async (shareId: string) => {
    try {
      await acceptShare(shareId, user?.id);
      toast('초대를 수락했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '수락 실패', 'error');
    }
  };

  const handleDecline = async (shareId: string) => {
    try {
      await declineShare(shareId);
      toast('초대를 거절했습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '거절 실패', 'error');
    }
  };

  const avatarUrl: string | undefined =
    profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-[#F9F4E8]/80 dark:bg-[#221910]/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 border-b border-[#f48c25]/10">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <div className="bg-[#f48c25] text-white p-1.5 rounded-lg flex items-center justify-center rotate-12 border-[3px] border-[#1c140d]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tighter uppercase italic text-[#1c140d] dark:text-slate-100">Anecdote</h1>
      </Link>

      <div className="flex items-center gap-3">
        {/* 다크 모드 토글 */}
        <button
          onClick={toggleDark}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#f48c25] transition-colors cursor-pointer bg-transparent border-0"
          title={isDark ? '라이트 모드' : '다크 모드'}
        >
          {isDark ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* 알림 벨 */}
        {user && (
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((p) => !p)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#f48c25] transition-colors cursor-pointer bg-transparent border-0 relative"
              title="초대 알림"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {invitations.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#f43f5e] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#F9F4E8] dark:border-[#221910] animate-pulse">
                  {invitations.length}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {bellOpen && (
              <div className="absolute right-0 top-12 w-80 max-h-[70vh] overflow-y-auto bg-[#F9F4E8] dark:bg-[#1a1208] border-[3px] border-slate-900 dark:border-slate-600 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] z-50">
                <div className="p-3 border-b-2 border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Incoming Transmissions</p>
                </div>
                {invitations.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-2xl mb-2">📡</p>
                    <p className="text-xs text-slate-400 font-medium">수신된 초대가 없습니다</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-white dark:bg-[#2a1f15] p-3 rounded-lg border-2 border-[#0d9488]/30"
                      >
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {inv.trip_title || '여행 초대'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {inv.owner_nickname || '사용자'}님 · {inv.permission === 'edit' ? '편집' : '읽기'} 권한
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAccept(inv.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#0d9488] border-2 border-slate-900 cursor-pointer hover:bg-[#0d9488]/90 transition-colors"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => handleDecline(inv.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-[#1a1208] border-2 border-slate-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a1f15] transition-colors"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 유저 프로필 */}
        {user && (
          <Link to="/profile" className="no-underline">
            <div className="w-10 h-10 rounded-full border-2 border-[#f48c25] overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#f48c25]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#f48c25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </Link>
        )}

        {isDemo && (
          <span className="text-[10px] bg-[#eab308]/20 text-[#eab308] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border-2 border-[#eab308]">
            Demo
          </span>
        )}

        {!isDemo && user && (
          <button
            onClick={signOut}
            className="text-xs font-bold text-slate-400 hover:text-[#f48c25] transition-colors cursor-pointer uppercase tracking-wider bg-transparent border-0"
          >
            logout
          </button>
        )}
      </div>
    </header>
  );
}
