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
        <div className="w-8 h-8 border-3 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#FF6B6B]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#FFD166]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-[#7EC8E3]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 page-enter">
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          {/* Globe icon */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div
              className="w-full h-full rounded-full float"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FFD166 50%, #7EC8E3 100%)',
                boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.354-5.646M12 21a9.004 9.004 0 01-8.354-5.646M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[#FF6B6B] tracking-tight">
            Anecdote World
          </h1>
          <p className="text-sm text-gray-400 mt-2 italic">
            Capturing your shiny moments...
          </p>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-[#F0EEE6] rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-sm card-hover btn-press scale-in"
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
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#FEE500] rounded-2xl text-sm font-medium text-[#191919] hover:bg-[#FDD800] transition-all cursor-pointer shadow-sm card-hover btn-press scale-in"
            style={{ animationDelay: '0.08s' }}
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
