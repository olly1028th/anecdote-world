import { Link, useLocation } from 'react-router-dom';

interface Props {
  onAddClick?: () => void;
}

export default function BottomNav({ onAddClick }: Props) {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 w-full bg-[#F9F4E8] dark:bg-[#221910] border-t-2 border-[#f48c25]/20 pb-[env(safe-area-inset-bottom,32px)] pt-2 px-4 sm:px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {/* 홈 */}
        <Link to="/" className={`flex flex-col items-center justify-center gap-0.5 no-underline min-w-[44px] min-h-[44px] px-1 ${isActive('/') ? 'text-[#f48c25]' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill={isActive('/') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/') ? 0 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold uppercase">Base</span>
        </Link>

        {/* 지도 */}
        <Link to="/pin/new" className={`flex flex-col items-center justify-center gap-0.5 no-underline min-w-[44px] min-h-[44px] px-1 ${isActive('/pin/new') ? 'text-[#f48c25]' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold uppercase">Galaxy</span>
        </Link>

        {/* FAB 추가 버튼 */}
        <button
          type="button"
          onClick={onAddClick}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f48c25] rounded-full flex items-center justify-center border-[3px] border-slate-900 shadow-[0_6px_0_0_#925417] active:shadow-none active:translate-y-1 transition-all cursor-pointer -translate-y-4"
        >
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* 대시보드 */}
        <Link to="/dashboard" className={`flex flex-col items-center justify-center gap-0.5 no-underline min-w-[44px] min-h-[44px] px-1 ${isActive('/dashboard') ? 'text-[#f48c25]' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-bold uppercase">Stats</span>
        </Link>

        {/* 프로필 */}
        <Link to="/profile" className={`flex flex-col items-center justify-center gap-0.5 no-underline min-w-[44px] min-h-[44px] px-1 ${isActive('/profile') ? 'text-[#f48c25]' : 'text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
