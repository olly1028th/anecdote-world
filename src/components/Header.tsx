import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Header() {
  const { user, profile, isDemo, signOut } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();

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
