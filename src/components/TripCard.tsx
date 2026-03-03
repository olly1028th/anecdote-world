import { Link } from 'react-router-dom';
import type { Trip, TripStatus } from '../types/trip';
import { formatCurrency, totalExpenses } from '../utils/format';
import { getCountryFlagUrl } from '../utils/countryFlag';

interface Props {
  trip: Trip;
  colorIndex?: number;
  onStatusChange?: (tripId: string, newStatus: TripStatus) => void;
}

// Colored shadow themes matching code(main).html Stitch design
const CARD_THEMES = [
  { shadow: 'shadow-[8px_8px_0px_0px_rgba(234,179,8,1)]', badge: 'bg-[#eab308] text-slate-900', label: 'Earthly Delights' },
  { shadow: 'shadow-[8px_8px_0px_0px_rgba(13,148,136,1)]', badge: 'bg-[#0d9488] text-white', label: 'Orbiting' },
  { shadow: 'shadow-[8px_8px_0px_0px_rgba(244,63,94,1)]', badge: 'bg-[#f43f5e] text-white', label: 'Deep Space' },
];

export default function TripCard({ trip, colorIndex = 0, onStatusChange }: Props) {
  const theme = CARD_THEMES[colorIndex % CARD_THEMES.length];
  const total = totalExpenses(trip.expenses);
  const coverSrc = trip.coverImage || getCountryFlagUrl(trip.destination, 640);

  const handleStatusClick = (e: React.MouseEvent) => {
    if (!onStatusChange) return;
    e.preventDefault();
    e.stopPropagation();
    const order: TripStatus[] = ['planned', 'completed', 'wishlist'];
    const currentIdx = order.indexOf(trip.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    onStatusChange(trip.id, nextStatus);
  };

  return (
    <Link
      to={`/trip/${trip.id}`}
      className={`group block bg-white dark:bg-slate-900 border-[3px] border-slate-900 dark:border-slate-100 rounded-xl overflow-hidden ${theme.shadow} no-underline hover:-translate-y-1 transition-transform duration-300`}
    >
      {/* 커버 이미지 */}
      <div className="aspect-[4/3] relative overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={trip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#f48c25]/30 via-[#eab308]/20 to-[#0d9488]/30 flex items-center justify-center">
            <span className="text-5xl">🌍</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <button
            type="button"
            onClick={handleStatusClick}
            title={onStatusChange ? '클릭하여 상태 전환' : undefined}
            className={`text-[10px] font-bold px-3 py-1 rounded-full border-2 border-slate-900 uppercase ${theme.badge} ${onStatusChange ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : 'cursor-default'}`}
          >
            {trip.status === 'completed' ? 'Visited' : trip.status === 'wishlist' ? 'Wish' : 'Planned'}
          </button>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">{trip.title}</h3>
            {trip.destination && (
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {trip.destination}
              </p>
            )}
          </div>
        </div>

        {/* 후기/메모 또는 비용 */}
        {trip.memo ? (
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
            {trip.memo}
          </p>
        ) : total > 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            예상 경비: <span className="font-bold">{formatCurrency(total)}</span>
          </p>
        ) : null}

        <div className="w-full bg-[#f48c25] text-slate-900 py-3 rounded-lg font-bold border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center text-sm uppercase tracking-wider">
          Log Data Recap
        </div>
      </div>
    </Link>
  );
}
