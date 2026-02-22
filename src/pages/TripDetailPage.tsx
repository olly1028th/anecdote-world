import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTrip, deleteTrip, toggleChecklistItem } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import PhotoGallery from '../components/PhotoGallery';
import { TripDetailHeaderSkeleton } from '../components/Skeleton';
import { formatDate, calcDuration } from '../utils/format';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trip, loading, error, refetch } = useTrip(id);
  const [deleting, setDeleting] = useState(false);

  const memoRef = useScrollReveal<HTMLQuoteElement>();
  const contentRef = useScrollReveal<HTMLDivElement>();

  const handleChecklistToggle = async (index: number) => {
    if (!trip) return;
    const item = trip.checklist[index];
    if (!item?.id) return;
    if (!isSupabaseConfigured) return;

    try {
      await toggleChecklistItem(item.id, !item.checked);
      refetch();
    } catch (err) {
      console.error('체크리스트 토글 실패:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!isSupabaseConfigured) {
      alert('데모 모드에서는 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm('이 여행을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    try {
      setDeleting(true);
      await deleteTrip(id);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-6 space-y-6 page-enter">
        <TripDetailHeaderSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center page-enter">
        <p className="text-[#FF6B6B]">{error}</p>
        <Link to="/" className="text-[#FF6B6B] text-sm mt-2 inline-block no-underline hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-6 py-20 text-center page-enter">
        <p className="text-xl text-gray-400">여행을 찾을 수 없습니다</p>
        <Link to="/" className="text-[#FF6B6B] text-sm mt-2 inline-block no-underline hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isCompleted = trip.status === 'completed';

  return (
    <div className="px-6 space-y-6 page-enter">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#FF6B6B] transition-colors no-underline btn-press"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </Link>

      {/* 헤더 영역 */}
      <div className="relative rounded-3xl overflow-hidden shadow-md shadow-gray-200/50 scale-in">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isCompleted ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {isCompleted ? '완료' : '계획 중'}
          </span>
          <h1 className="text-3xl font-bold mt-2">{trip.title}</h1>
          {trip.destination && (
            <p className="text-white/80 mt-1">{trip.destination}</p>
          )}
          <p className="text-white/60 text-sm mt-1">
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)} ({calcDuration(trip.startDate, trip.endDate)})
          </p>
        </div>
        {/* 수정/삭제 버튼 */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Link
            to={`/trip/edit/${trip.id}`}
            className="bg-white/90 backdrop-blur-md hover:bg-white text-[#4A4A4A] px-3 py-1.5 rounded-full text-sm font-medium no-underline transition-colors shadow-sm btn-press"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-[#FF6B6B]/90 backdrop-blur-md hover:bg-[#FF6B6B] text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50 btn-press"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>

      {/* 한줄 후기 (완료 여행) */}
      {isCompleted && trip.memo && (
        <blockquote ref={memoRef} className="bg-[#FFD166]/10 border-l-4 border-[#FFD166] px-5 py-4 rounded-r-2xl fade-up">
          <p className="text-[#4A4A4A] italic">"{trip.memo}"</p>
        </blockquote>
      )}

      {/* 콘텐츠 영역 */}
      <div ref={contentRef} className="space-y-6 fade-up">
        {/* 사진 갤러리 */}
        {trip.photos.length > 0 && (
          <PhotoGallery photos={trip.photos} />
        )}

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
          <Checklist items={trip.checklist} onToggle={handleChecklistToggle} />
        )}
      </div>
    </div>
  );
}
