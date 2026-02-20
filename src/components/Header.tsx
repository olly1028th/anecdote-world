import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, profile, isDemo, signOut } = useAuth();

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

        {/* 유저 영역 */}
        {user && (
          <div className="flex items-center gap-3">
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
