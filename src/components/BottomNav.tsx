import { Link, useLocation } from 'react-router-dom';

interface Props {
  onAddClick?: () => void;
}

export default function BottomNav({ onAddClick }: Props) {
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-5 left-5 right-5 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-8 py-3.5 flex justify-between items-center z-50">
      {/* 홈 */}
      <NavIcon to="/" active={isActive('/')} label="홈">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/') ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </NavIcon>

      {/* 지도 (핀) */}
      <NavIcon to="/pin/new" active={isActive('/pin/new')} label="핀">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </NavIcon>

      {/* 추가 버튼 (가운데 크게) */}
      <button
        type="button"
        onClick={onAddClick}
        className="bg-[#FF6B6B] p-2.5 rounded-full -mt-10 border-4 border-[var(--color-bg)] shadow-lg shadow-[#FF6B6B]/30 hover:scale-110 active:scale-95 transition-transform cursor-pointer relative"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#FF6B6B]/40" style={{ animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
        <svg className="w-7 h-7 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 대시보드 */}
      <NavIcon to="/dashboard" active={isActive('/dashboard')} label="통계">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </NavIcon>

      {/* 프로필 */}
      <NavIcon to="/profile" active={isActive('/profile')} label="프로필">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </NavIcon>
    </nav>
  );
}

function NavIcon({
  to,
  active,
  label,
  children,
}: {
  to: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`no-underline flex flex-col items-center gap-0.5 transition-all duration-200 btn-press ${
        active ? 'text-[#FF6B6B]' : 'text-gray-300 hover:text-[#FF6B6B]'
      }`}
    >
      <div className="relative">
        {children}
        {active && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6B6B]" />
        )}
      </div>
      <span className={`text-[9px] font-medium ${active ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
}
