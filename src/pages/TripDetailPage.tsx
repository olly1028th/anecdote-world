import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTrip, deleteTrip, toggleChecklistItem } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import PhotoGallery from '../components/PhotoGallery';
import { formatDate, calcDuration, totalExpenses, formatCurrency } from '../utils/format';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trip, loading, error, refetch } = useTrip(id);
  const [deleting, setDeleting] = useState(false);

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
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-[#2D3436]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#FF6B6B] font-bold">{error}</p>
        <Link to="/" className="text-[#FF6B6B] text-sm mt-3 inline-block no-underline font-bold uppercase tracking-wider hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-xl font-black text-[#2D3436]/40">여행을 찾을 수 없습니다</p>
        <Link to="/" className="text-[#FF6B6B] text-sm mt-3 inline-block no-underline font-bold uppercase tracking-wider hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isCompleted = trip.status === 'completed';
  const checklistDone = trip.checklist.filter((c) => c.checked).length;
  const checklistTotal = trip.checklist.length;

  return (
    <div className="px-6 space-y-6 pb-8">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-[#2D3436]/50 hover:text-[#FF6B6B] transition-colors no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* 헤더 카드 */}
      <div className="relative border-4 border-[#2D3436] rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_#2D3436]">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D3436]/80 via-transparent to-transparent" />

        {/* 상태 뱃지 + 타이틀 */}
        <div className="absolute bottom-0 left-0 p-5 text-white">
          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-white/30 ${
            isCompleted ? 'bg-[#4ECDC4]' : 'bg-[#FFD166] text-[#2D3436]'
          }`}>
            {isCompleted ? 'Visited' : 'Planned'}
          </span>
          <h1 className="text-2xl font-black italic mt-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">{trip.title}</h1>
          {trip.destination && (
            <p className="text-white/80 text-sm font-bold mt-1">{trip.destination}</p>
          )}
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mt-1">
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)} ({calcDuration(trip.startDate, trip.endDate)})
          </p>
        </div>

        {/* 수정/삭제 버튼 */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Link
            to={`/trip/edit/${trip.id}`}
            className="bg-white border-2 border-[#2D3436] text-[#2D3436] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider no-underline shadow-[2px_2px_0px_0px_#2D3436] hover:-translate-y-0.5 transition-transform"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-[#FF6B6B] border-2 border-[#2D3436] text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#2D3436] cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 transition-transform"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>

      {/* 한줄 후기 (완료 여행) */}
      {isCompleted && trip.memo && (
        <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-[#FFD166]/15 shadow-[4px_4px_0px_0px_#2D3436]">
          <p className="text-xs font-black uppercase tracking-widest text-[#2D3436]/50 mb-2">Review</p>
          <p className="text-[#2D3436] font-bold italic">"{trip.memo}"</p>
        </div>
      )}

      {/* ─── 계획 여행 전용: 퀵 인포 카드 ─── */}
      {!isCompleted && (
        <div className="grid grid-cols-3 gap-3">
          {/* 예상 경비 */}
          <div className="border-4 border-[#2D3436] rounded-[20px] p-3 bg-[#FFD166]/20 shadow-[3px_3px_0px_0px_#2D3436] text-center">
            <span className="block text-lg">💰</span>
            <p className="text-[10px] font-black uppercase tracking-tight mt-1 text-[#2D3436]/60">Budget</p>
            <p className="text-sm font-black mt-0.5 text-[#2D3436]">
              {trip.expenses.length > 0 ? formatCurrency(totalExpenses(trip.expenses)) : '-'}
            </p>
          </div>
          {/* 장소 수 */}
          <div className="border-4 border-[#2D3436] rounded-[20px] p-3 bg-[#4ECDC4]/20 shadow-[3px_3px_0px_0px_#2D3436] text-center">
            <span className="block text-lg">📍</span>
            <p className="text-[10px] font-black uppercase tracking-tight mt-1 text-[#2D3436]/60">Places</p>
            <p className="text-sm font-black mt-0.5 text-[#2D3436]">{trip.places.length}곳</p>
          </div>
          {/* 체크리스트 */}
          <div className="border-4 border-[#2D3436] rounded-[20px] p-3 bg-[#FF6B6B]/20 shadow-[3px_3px_0px_0px_#2D3436] text-center">
            <span className="block text-lg">✅</span>
            <p className="text-[10px] font-black uppercase tracking-tight mt-1 text-[#2D3436]/60">Checklist</p>
            <p className="text-sm font-black mt-0.5 text-[#2D3436]">{checklistDone}/{checklistTotal}</p>
          </div>
        </div>
      )}

      {/* ─── 콘텐츠 섹션들 ─── */}
      <div className="space-y-6">
        {/* 사진 갤러리 */}
        {trip.photos.length > 0 && (
          <PhotoGallery photos={trip.photos} />
        )}

        {/* 완료 여행: 일정 타임라인 */}
        {isCompleted && trip.itinerary.length > 0 && (
          <Timeline items={trip.itinerary} />
        )}

        {/* 계획 여행: 추천 장소 / 루트 */}
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

        {/* 계획 여행: 메모 영역 */}
        {!isCompleted && trip.memo && (
          <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">Memo</h3>
              <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
            </div>
            <p className="text-sm text-[#2D3436]/70 font-medium leading-relaxed">{trip.memo}</p>
          </div>
        )}

        {/* 비어있는 계획 여행 — 등록 유도 */}
        {!isCompleted && trip.expenses.length === 0 && trip.places.length === 0 && trip.checklist.length === 0 && (
          <div className="border-4 border-dashed border-[#2D3436]/20 rounded-[24px] p-8 text-center">
            <p className="text-3xl mb-3">🚀</p>
            <p className="text-base font-black text-[#2D3436]/40">아직 등록된 정보가 없어요</p>
            <p className="text-xs text-[#2D3436]/30 font-medium mt-1 mb-4">경비, 루트, 숙소, 체크리스트 등을 등록해보세요!</p>
            <Link
              to={`/trip/edit/${trip.id}`}
              className="inline-block bg-[#FFD166] border-3 border-[#2D3436] text-[#2D3436] px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider no-underline shadow-[4px_4px_0px_0px_#2D3436] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              정보 등록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
