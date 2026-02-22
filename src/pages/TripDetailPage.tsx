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
        <div className="animate-pulse text-[#1c140d]/40 font-bold uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#f43f5e] font-bold">{error}</p>
        <Link to="/" className="text-[#f48c25] text-sm mt-3 inline-block no-underline font-bold uppercase tracking-wider hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-xl font-bold text-slate-400">여행을 찾을 수 없습니다</p>
        <Link to="/" className="text-[#f48c25] text-sm mt-3 inline-block no-underline font-bold uppercase tracking-wider hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isCompleted = trip.status === 'completed';
  const checklistDone = trip.checklist.filter((c) => c.checked).length;
  const checklistTotal = trip.checklist.length;

  return (
    <div className="max-w-md mx-auto px-4 pt-4 space-y-6 pb-24">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-400 hover:text-[#f48c25] transition-colors no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* 프로필 스타일 헤더 — code(detail) 참조 */}
      <section className="flex flex-col items-center text-center space-y-4">
        {/* 커버 이미지 (행성 스타일) */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-[3px] border-slate-900 overflow-hidden bg-white retro-shadow relative z-10">
            <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
          </div>
          {/* 상태 뱃지 */}
          <div className={`absolute -bottom-2 -right-2 border-[3px] border-slate-900 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest z-20 ${
            isCompleted ? 'bg-[#0d9488] text-white' : 'bg-[#eab308] text-slate-900'
          }`}>
            {isCompleted ? 'Visited' : 'Planned'}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase italic">{trip.title}</h2>
          {trip.destination && (
            <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{trip.destination}</span>
            </div>
          )}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)} ({calcDuration(trip.startDate, trip.endDate)})
          </p>
        </div>

        {/* 수정/삭제 버튼 */}
        <div className="flex gap-3 w-full">
          <Link
            to={`/trip/edit/${trip.id}`}
            className="flex-1 bg-[#f48c25] hover:bg-[#f48c25]/90 text-white font-bold py-3 px-6 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 uppercase tracking-widest text-sm text-center no-underline"
          >
            Edit Mission
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-3 px-4 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </section>

      {/* Stats Grid — code(detail) 2x2 패턴 */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#0d9488]/20 border-2 border-[#0d9488] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Places</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{trip.places.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#eab308]/20 border-2 border-[#eab308] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#eab308]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Budget</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {trip.expenses.length > 0 ? formatCurrency(totalExpenses(trip.expenses)) : '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#f43f5e]/20 border-2 border-[#f43f5e] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#f43f5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Photos</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{trip.photos.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#f48c25]/20 border-2 border-[#f48c25] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#f48c25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Checklist</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{checklistDone}/{checklistTotal}</p>
        </div>
      </section>

      {/* Progress Bar — code(detail) 참조 */}
      {checklistTotal > 0 && (
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border-[3px] border-slate-900 retro-shadow space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Mission Progress</h3>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{trip.title}</p>
            </div>
            <p className="text-2xl font-bold text-[#f48c25]">
              {checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0}%
            </p>
          </div>
          <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-lg border-2 border-slate-900 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#f48c25] rounded-r-lg flex items-center justify-end pr-2 transition-all duration-500"
              style={{ width: checklistTotal > 0 ? `${(checklistDone / checklistTotal) * 100}%` : '0%' }}
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
            {checklistTotal - checklistDone}개 항목 남음
          </p>
        </section>
      )}

      {/* 한줄 후기 (완료 여행) */}
      {isCompleted && trip.memo && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-[3px] border-slate-900 retro-shadow">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Mission Review</h3>
          <p className="text-slate-900 dark:text-slate-100 font-medium italic">"{trip.memo}"</p>
        </div>
      )}

      {/* 콘텐츠 섹션들 */}
      <div className="space-y-6">
        {trip.photos.length > 0 && <PhotoGallery photos={trip.photos} />}
        {isCompleted && trip.itinerary.length > 0 && <Timeline items={trip.itinerary} />}
        {!isCompleted && trip.places.length > 0 && <PlaceList places={trip.places} />}
        {trip.expenses.length > 0 && <ExpenseTable expenses={trip.expenses} isEstimate={!isCompleted} />}
        {!isCompleted && trip.checklist.length > 0 && <Checklist items={trip.checklist} onToggle={handleChecklistToggle} />}

        {/* 계획 여행: 메모 */}
        {!isCompleted && trip.memo && (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-[3px] border-slate-900 retro-shadow">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Mission Notes</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{trip.memo}</p>
          </div>
        )}

        {/* 비어있는 계획 여행 — 등록 유도 */}
        {!isCompleted && trip.expenses.length === 0 && trip.places.length === 0 && trip.checklist.length === 0 && (
          <div className="border-[3px] border-dashed border-slate-300 rounded-xl p-8 text-center">
            <p className="text-3xl mb-3">🚀</p>
            <p className="text-base font-bold text-slate-400">아직 등록된 정보가 없어요</p>
            <p className="text-xs text-slate-300 font-medium mt-1 mb-4">경비, 루트, 숙소, 체크리스트 등을 등록해보세요!</p>
            <Link
              to={`/trip/edit/${trip.id}`}
              className="inline-block bg-[#f48c25] text-white px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider no-underline border-[3px] border-slate-900 retro-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Launch Mission Setup
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
