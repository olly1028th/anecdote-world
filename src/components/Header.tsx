import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Header() {
  const { user, profile, isDemo, signOut } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const displayName =
    profile?.nickname ?? user?.user_metadata?.full_name ?? '여행자';
  const avatarUrl: string | undefined =
    profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <header className="px-6 pt-6 pb-4 flex justify-between items-end">
      <Link to="/" className="no-underline">
        <h1 className="text-3xl font-black italic tracking-tighter text-[#FF6B6B] drop-shadow-[2px_2px_0px_#2D3436]">
          ANECDOTE
          <br />
          WORLD
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full bg-[#4ECDC4] animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]/60">
            System Online
          </p>
        </div>
      </Link>

      {user && (
        <div className="flex items-center gap-3">
          {/* 다크 모드 토글 */}
          <button
            onClick={toggleDark}
            className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-[#2D3436] bg-white text-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436] hover:bg-[#FF6B6B]/10 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#2D3436] transition-all cursor-pointer"
            title={isDark ? '라이트 모드' : '다크 모드'}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* 유저 프로필 */}
          <Link to="/profile" className="no-underline">
            <div className="border-4 border-[#2D3436] bg-[#FFD166] p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_#2D3436] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg className="w-6 h-6 text-[#2D3436]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </Link>

          {isDemo && (
            <span className="text-[10px] bg-[#FFD166] text-[#2D3436] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border-2 border-[#2D3436]">
              Demo
            </span>
          )}

          {!isDemo && (
            <button
              onClick={signOut}
              className="text-xs font-bold text-[#2D3436]/50 hover:text-[#FF6B6B] transition-colors cursor-pointer uppercase tracking-wider"
            >
              logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
