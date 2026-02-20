import { useParams, Link } from 'react-router-dom';
import { useTrip } from '../hooks/useTrips';
import StatusBadge from '../components/StatusBadge';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import { formatDate, calcDuration } from '../utils/format';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { trip, loading, error } = useTrip(id);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500">{error}</p>
        <Link to="/" className="text-blue-600 text-sm mt-2 inline-block">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-gray-400">여행을 찾을 수 없습니다</p>
        <Link to="/" className="text-blue-600 text-sm mt-2 inline-block">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isCompleted = trip.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </Link>

      {/* 헤더 영역 */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <StatusBadge status={trip.status} />
          <h1 className="text-3xl font-bold mt-2">{trip.title}</h1>
          <p className="text-white/80 mt-1">{trip.destination}</p>
          <p className="text-white/60 text-sm mt-1">
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)} ({calcDuration(trip.startDate, trip.endDate)})
          </p>
        </div>
      </div>

      {/* 한줄 후기 (완료 여행) */}
      {isCompleted && trip.memo && (
        <blockquote className="bg-blue-50 border-l-4 border-blue-400 px-5 py-4 rounded-r-xl mb-6">
          <p className="text-gray-700 italic">"{trip.memo}"</p>
        </blockquote>
      )}

      {/* 콘텐츠 영역 */}
      <div className="space-y-6">
        {/* 완료 여행: 일정 타임라인 */}
        {isCompleted && trip.itinerary.length > 0 && (
          <Timeline items={trip.itinerary} />
        )}

        {/* 계획 여행: 추천 장소 */}
        {!isCompleted && trip.places.length > 0 && (
          <PlaceList places={trip.places} />
        )}

        {/* 경비 */}
        {trip.expenses.length > 0 && (
          <ExpenseTable expenses={trip.expenses} isEstimate={!isCompleted} />
        )}

        {/* 계획 여행: 체크리스트 */}
        {!isCompleted && trip.checklist.length > 0 && (
          <Checklist items={trip.checklist} />
        )}
      </div>
    </div>
  );
}
