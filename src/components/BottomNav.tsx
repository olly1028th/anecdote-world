import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  const iconClass = (path: string) =>
    isActive(path) ? 'text-[#FF6B6B]' : 'text-gray-300 hover:text-[#FF6B6B] transition-colors';

  return (
    <nav className="fixed bottom-5 left-5 right-5 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-8 py-3.5 flex justify-between items-center z-50">
      {/* 홈 */}
      <Link to="/" className={`no-underline ${iconClass('/')}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/') ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {/* 지도 (핀) */}
      <Link to="/pin/new" className={`no-underline ${iconClass('/pin/new')}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </Link>

      {/* 추가 버튼 (가운데 크게) */}
      <Link
        to="/trip/new"
        className="bg-[#FF6B6B] p-2.5 rounded-full -mt-10 border-4 border-[var(--color-bg)] shadow-lg shadow-[#FF6B6B]/30 hover:scale-110 transition-transform no-underline"
      >
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* 대시보드 */}
      <Link to="/dashboard" className={`no-underline ${iconClass('/dashboard')}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </Link>

      {/* 프로필 */}
      <Link to="/profile" className={`no-underline ${iconClass('/profile')}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </Link>
    </nav>
  );
}
