import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, loading, isDemo, signInWithGoogle, signInWithKakao } = useAuth();

  if (!loading && (user || isDemo)) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F4E8]">
        <div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F4E8] dark:bg-[#221910] min-h-screen relative overflow-hidden">
      {/* Vintage Grain Overlay */}
      <div className="fixed inset-0 vintage-grain z-50" />

      <div className="relative flex flex-col min-h-screen max-w-md mx-auto px-6 py-12 justify-between z-10">
        {/* Header */}
        <header className="text-center space-y-2 mt-8">
          <div className="inline-block px-3 py-1 bg-[#f48c25]/20 rounded-full text-[#f48c25] font-bold text-xs uppercase tracking-widest mb-2">
            Mission Control
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#1c140d] dark:text-slate-100 uppercase italic">
            Anecdote<br />World
          </h1>
          <p className="text-lg font-medium text-[#1c140d]/70 dark:text-slate-400 max-w-[280px] mx-auto leading-tight">
            Chart your journey through the stars and beyond.
          </p>
        </header>

        {/* Hero Illustration */}
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Abstract Retro Shapes */}
            <div className="absolute w-48 h-48 bg-[#0d9488] rounded-full opacity-20" />
            <div className="absolute w-32 h-32 bg-[#f48c25] rounded-lg rotate-45 opacity-10" />
            {/* Stylized Rocket */}
            <svg className="w-48 h-48 text-[#f48c25] drop-shadow-[8px_8px_0px_rgba(28,20,13,0.1)]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 19 8 19 14C19 15.5 18 17 16.5 18L18 21L15 20L12 22L9 20L6 21L7.5 18C6 17 5 15.5 5 14C5 8 12 2 12 2Z" fill="currentColor" stroke="#1c140d" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <circle cx="12" cy="11" r="2" fill="#F9F4E8" stroke="#1c140d" strokeWidth="1" />
              <path d="M9 16.5C9 16.5 10.5 16 12 16C13.5 16 15 16.5 15 16.5" stroke="#1c140d" strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <button
            onClick={signInWithGoogle}
            className="w-full h-14 sm:h-16 bg-white dark:bg-slate-100 text-[#1c140d] font-bold text-base sm:text-lg rounded-lg retro-border flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={signInWithKakao}
            className="w-full h-14 sm:h-16 bg-[#FEE500] text-[#1c140d] font-bold text-base sm:text-lg rounded-lg retro-border flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1c140d">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.63 1.76 4.94 4.4 6.26-.14.53-.92 3.41-.95 3.63 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.62.09 1.27.14 1.94.14 5.52 0 10-3.36 10-7.42C22 6.36 17.52 3 12 3z" />
            </svg>
            Continue with Kakao
          </button>
        </div>

        {/* Footer */}
        <footer className="text-center">
          <p className="text-[#1c140d]/60 dark:text-slate-400 font-medium text-sm">
            로그인하면 여행 기록을 안전하게 저장할 수 있습니다
          </p>
        </footer>
      </div>

      {/* Decorative Stars */}
      <div className="absolute top-20 left-10 text-[#0d9488] opacity-30 select-none text-4xl">✦</div>
      <div className="absolute bottom-40 right-12 text-[#f48c25] opacity-20 select-none text-6xl">✧</div>
      <div className="absolute top-1/2 left-4 text-[#1c140d] opacity-10 select-none text-2xl">●</div>
    </div>
  );
}
