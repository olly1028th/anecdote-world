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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="no-underline">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Anecdote World
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Life is short and the world is wide.
          </p>
        </Link>

        {/* 네비게이션 + 유저 영역 */}
        {user && (
          <div className="flex items-center gap-4">
            {/* 네비 링크 */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors no-underline"
              >
                대시보드
              </Link>
            </nav>

            {/* 다크 모드 토글 */}
            <button
              onClick={toggleDark}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title={isDark ? '라이트 모드' : '다크 모드'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* 유저 프로필 (프로필 페이지로 링크) */}
            <Link to="/profile" className="flex items-center gap-2 no-underline">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                  {displayName.charAt(0)}
                </div>
              )}

              <span className="text-sm text-gray-700 hidden sm:inline">
                {displayName}
              </span>
            </Link>

            {isDemo && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Demo
              </span>
            )}

            {!isDemo && (
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
