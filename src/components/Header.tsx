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
      <Link to="/" className="no-underline group">
        <h1 className="text-2xl font-bold text-[#FF6B6B] tracking-tight transition-transform duration-200 group-hover:scale-105 origin-left">
          Anecdote World
        </h1>
      </Link>

      {user && (
        <div className="flex items-center gap-3">
          {/* 다크 모드 토글 */}
          <button
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all cursor-pointer btn-press"
            title={isDark ? '라이트 모드' : '다크 모드'}
          >
            <div className="transition-transform duration-300" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          </button>

          {/* 유저 프로필 */}
          <Link to="/profile" className="no-underline">
            <div className="bg-[#FFD166] p-1.5 rounded-full shadow-sm hover:scale-110 active:scale-95 transition-transform">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </Link>

          {isDemo && (
            <span className="text-[10px] bg-[#FFD166]/20 text-[#FF9F43] px-2 py-0.5 rounded-full font-bold">
              Demo
            </span>
          )}

          {!isDemo && (
            <button
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-[#FF6B6B] transition-colors cursor-pointer btn-press"
            >
              로그아웃
            </button>
          )}
        </div>
      )}
    </header>
  );
}
