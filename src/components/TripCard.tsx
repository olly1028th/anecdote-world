import { Link } from 'react-router-dom';
import type { Trip } from '../types/trip';
import { formatDate, calcDuration, formatCurrency, totalExpenses } from '../utils/format';

interface Props {
  trip: Trip;
}

export default function TripCard({ trip }: Props) {
  const total = totalExpenses(trip.expenses);

  return (
    <Link
      to={`/trip/${trip.id}`}
      className="block bg-white border-4 border-[#2D3436] rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_#2D3436] hover:-translate-y-1 transition-transform duration-300 no-underline"
    >
      {/* 커버 이미지 */}
      <div className="relative h-56 overflow-hidden border-b-4 border-[#2D3436]">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 border-2 border-[#2D3436] bg-[#FF6B6B] px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-[3px_3px_0px_0px_#2D3436]">
          {trip.destination || (trip.status === 'completed' ? '완료' : '계획 중')}
        </div>
        <div className="absolute bottom-4 right-4 bg-white border-2 border-[#2D3436] px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#2D3436]">
          {trip.status === 'completed' ? 'Visited' : 'Planned'}
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-5">
        <h3 className="text-lg font-black italic uppercase tracking-tighter leading-tight text-[#2D3436]">
          {trip.title}
        </h3>
        {trip.destination && (
          <p className="text-xs font-bold text-[#2D3436]/40 mt-1 uppercase tracking-wider">{trip.destination}</p>
        )}

        <div className="flex items-center justify-between mt-3 text-xs font-bold text-[#2D3436]/50 uppercase tracking-wider">
          <span>
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
          </span>
          <span>{calcDuration(trip.startDate, trip.endDate)}</span>
        </div>

        {/* 경비 요약 */}
        <div className="mt-3 pt-3 border-t-2 border-[#2D3436]/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2D3436]/50 uppercase tracking-wider">
              {trip.status === 'completed' ? 'Total Cost' : 'Est. Cost'}
            </span>
            <span className="text-base font-black text-[#2D3436]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* 완료 여행: 한줄 후기 / 계획 여행: 준비도 */}
        {trip.status === 'completed' && trip.memo && (
          <p className="mt-2 text-xs font-medium text-[#2D3436]/50 truncate italic">"{trip.memo}"</p>
        )}
        {trip.status === 'planned' && trip.checklist.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2D3436]/40 uppercase tracking-wider">
              <span>
                Ready {trip.checklist.filter((c) => c.checked).length}/{trip.checklist.length}
              </span>
              <div className="flex-1 bg-[#2D3436]/10 rounded-full h-2 border border-[#2D3436]/20">
                <div
                  className="bg-[#FFD166] h-full rounded-full transition-all border-r border-[#2D3436]/20"
                  style={{
                    width: `${(trip.checklist.filter((c) => c.checked).length / trip.checklist.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
