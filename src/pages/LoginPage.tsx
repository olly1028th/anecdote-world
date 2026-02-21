import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, loading, isDemo, signInWithGoogle, signInWithKakao } = useAuth();

  // 이미 로그인됨 (또는 데모 모드) → 홈으로 리다이렉트
  if (!loading && (user || isDemo)) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#FF6B6B] tracking-tight">
            Anecdote World
          </h1>
          <p className="text-sm text-gray-400 mt-2 italic">
            Capturing your shiny moments... ✨
          </p>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[#F0EEE6] rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google로 시작하기
          </button>

          <button
            onClick={signInWithKakao}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] rounded-2xl text-sm font-medium text-[#191919] hover:bg-[#FDD800] transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.63 1.76 4.94 4.4 6.26-.14.53-.92 3.41-.95 3.63 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.62.09 1.27.14 1.94.14 5.52 0 10-3.36 10-7.42C22 6.36 17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-center text-xs text-gray-400 mt-8">
          로그인하면 여행 기록을 안전하게 저장할 수 있습니다
        </p>
      </div>
    </div>
  );
}
