import { Link } from 'react-router-dom';
import type { Trip } from '../types/trip';
import StatusBadge from './StatusBadge';
import { formatDate, calcDuration, formatCurrency, totalExpenses } from '../utils/format';

interface Props {
  trip: Trip;
}

export default function TripCard({ trip }: Props) {
  const total = totalExpenses(trip.expenses);

  return (
    <Link
      to={`/trip/${trip.id}`}
      className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow no-underline"
    >
      {/* 커버 이미지 */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={trip.status} />
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{trip.destination}</p>

        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
          </span>
          <span>{calcDuration(trip.startDate, trip.endDate)}</span>
        </div>

        {/* 경비 요약 */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {trip.status === 'completed' ? '총 경비' : '예상 경비'}
            </span>
            <span className="text-base font-semibold text-gray-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* 완료 여행: 한줄 후기 / 계획 여행: 준비도 */}
        {trip.status === 'completed' && trip.memo && (
          <p className="mt-2 text-sm text-gray-500 truncate">"{trip.memo}"</p>
        )}
        {trip.status === 'planned' && trip.checklist.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                준비도 {trip.checklist.filter((c) => c.checked).length}/{trip.checklist.length}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
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
