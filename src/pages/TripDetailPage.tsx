import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTrip, deleteTrip, toggleChecklistItem, saveExpenses, saveChecklistItems, updateDemoTrip, deleteDemoTrip } from '../hooks/useTrips';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUpload from '../components/PhotoUpload';
import { formatDate, calcDuration, totalExpenses, formatCurrency, expenseCategoryLabel } from '../utils/format';
import type { Expense, ExpenseCategory, ChecklistItem, Place, PlacePriority } from '../types/trip';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'flight', 'hotel', 'food', 'transport', 'activity', 'shopping', 'other',
];

const PLACE_PRIORITIES: { value: PlacePriority; label: string }[] = [
  { value: 'must', label: '필수' },
  { value: 'want', label: '가고싶음' },
  { value: 'maybe', label: '여유되면' },
];

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
    >
      Edit
    </button>
  );
}

function SaveCancelButtons({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving?: boolean }) {
  return (
    <div className="flex gap-2 mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-slate-500 bg-white border-2 border-slate-900 cursor-pointer hover:bg-gray-50 transition-all"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 retro-shadow hover:bg-[#d97a1e] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trip, loading, error, refetch } = useTrip(id);
  const [deleting, setDeleting] = useState(false);

  // Inline edit states
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingExpenses, setEditingExpenses] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [editingPlaces, setEditingPlaces] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);

  // Edit form data
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [draftCover, setDraftCover] = useState('');
  const [draftExpenses, setDraftExpenses] = useState<Expense[]>([]);
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);
  const [draftPlaces, setDraftPlaces] = useState<Place[]>([]);
  const [draftMemo, setDraftMemo] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Photo inline edit ---
  const startEditPhotos = () => {
    if (!trip) return;
    setDraftPhotos([...trip.photos]);
    setDraftCover(trip.coverImage || trip.photos[0] || '');
    setEditingPhotos(true);
  };
  const savePhotosInline = async () => {
    if (!trip || !id) return;
    try {
      setSaving(true);
      if (!isSupabaseConfigured) {
        updateDemoTrip(id, { photos: draftPhotos, coverImage: draftCover });
      } else {
        // Supabase: 커버 이미지만 DB에 저장 (사진은 Storage 사용)
        await supabase.from('trips').update({ cover_image: draftCover }).eq('id', id);
      }
      setEditingPhotos(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // --- Checklist Toggle (demo + supabase) ---
  const handleChecklistToggle = async (index: number) => {
    if (!trip || !id) return;
    const item = trip.checklist[index];
    if (!item) return;

    if (!isSupabaseConfigured) {
      const updated = trip.checklist.map((c, i) =>
        i === index ? { ...c, checked: !c.checked } : c,
      );
      updateDemoTrip(id, { checklist: updated });
      refetch();
      return;
    }

    if (!item.id) return;
    try {
      await toggleChecklistItem(item.id, !item.checked);
      refetch();
    } catch (err) {
      console.error('체크리스트 토글 실패:', err);
    }
  };

  // --- Delete (demo + supabase) ---
  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('이 여행을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;

    try {
      setDeleting(true);
      if (!isSupabaseConfigured) {
        deleteDemoTrip(id);
        window.dispatchEvent(new CustomEvent('trip-added'));
      } else {
        await deleteTrip(id);
      }
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다');
      setDeleting(false);
    }
  };

  // --- Expense inline edit ---
  const startEditExpenses = () => {
    if (!trip) return;
    setDraftExpenses(trip.expenses.length > 0 ? [...trip.expenses] : []);
    setEditingExpenses(true);
  };
  const addDraftExpense = () => setDraftExpenses([...draftExpenses, { category: 'other', amount: 0, label: '' }]);
  const removeDraftExpense = (i: number) => setDraftExpenses(draftExpenses.filter((_, idx) => idx !== i));
  const updateDraftExpense = (i: number, field: keyof Expense, value: string | number) => {
    setDraftExpenses(draftExpenses.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };
  const saveExpensesInline = async () => {
    if (!trip || !id) return;
    const valid = draftExpenses.filter((e) => e.amount > 0);
    try {
      setSaving(true);
      if (!isSupabaseConfigured) {
        updateDemoTrip(id, { expenses: valid });
      } else {
        await saveExpenses(id, valid);
      }
      setEditingExpenses(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // --- Checklist inline edit ---
  const startEditChecklist = () => {
    if (!trip) return;
    setDraftChecklist(trip.checklist.length > 0 ? [...trip.checklist] : []);
    setEditingChecklist(true);
  };
  const addDraftChecklistItem = () => setDraftChecklist([...draftChecklist, { text: '', checked: false }]);
  const removeDraftChecklistItem = (i: number) => setDraftChecklist(draftChecklist.filter((_, idx) => idx !== i));
  const updateDraftChecklistText = (i: number, text: string) => {
    setDraftChecklist(draftChecklist.map((c, idx) => (idx === i ? { ...c, text } : c)));
  };
  const saveChecklistInline = async () => {
    if (!trip || !id) return;
    const valid = draftChecklist.filter((c) => c.text.trim());
    try {
      setSaving(true);
      if (!isSupabaseConfigured) {
        updateDemoTrip(id, { checklist: valid });
      } else {
        await saveChecklistItems(id, valid);
      }
      setEditingChecklist(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // --- Places inline edit ---
  const startEditPlaces = () => {
    if (!trip) return;
    setDraftPlaces(trip.places.length > 0 ? [...trip.places] : []);
    setEditingPlaces(true);
  };
  const addDraftPlace = () => setDraftPlaces([...draftPlaces, { name: '', priority: 'want', note: '' }]);
  const removeDraftPlace = (i: number) => setDraftPlaces(draftPlaces.filter((_, idx) => idx !== i));
  const updateDraftPlace = (i: number, field: keyof Place, value: string) => {
    setDraftPlaces(draftPlaces.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };
  const savePlacesInline = async () => {
    if (!trip || !id) return;
    const valid = draftPlaces.filter((p) => p.name.trim());
    try {
      setSaving(true);
      if (!isSupabaseConfigured) {
        updateDemoTrip(id, { places: valid });
      } else {
        // Supabase에는 places 테이블이 없으므로 데모와 동일하게 처리
        updateDemoTrip(id, { places: valid });
      }
      setEditingPlaces(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // --- Memo inline edit ---
  const startEditMemo = () => {
    if (!trip) return;
    setDraftMemo(trip.memo || '');
    setEditingMemo(true);
  };
  const saveMemoInline = async () => {
    if (!trip || !id) return;
    try {
      setSaving(true);
      if (!isSupabaseConfigured) {
        updateDemoTrip(id, { memo: draftMemo.trim() });
      } else {
        await supabase.from('trips').update({ memo: draftMemo.trim() }).eq('id', id);
      }
      setEditingMemo(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
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

      {/* 프로필 스타일 헤더 */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-[3px] border-slate-900 overflow-hidden bg-white retro-shadow relative z-10">
            <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
          </div>
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

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div
          onClick={startEditPlaces}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2 cursor-pointer hover:border-[#f48c25] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[#0d9488]/20 border-2 border-[#0d9488] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Places</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{trip.places.length}</p>
        </div>

        <div
          onClick={startEditExpenses}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2 cursor-pointer hover:border-[#f48c25] transition-colors"
        >
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

        <div
          onClick={startEditPhotos}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2 cursor-pointer hover:border-[#f48c25] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[#f43f5e]/20 border-2 border-[#f43f5e] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#f43f5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Photos</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{trip.photos.length}</p>
        </div>

        <div
          onClick={startEditChecklist}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2 cursor-pointer hover:border-[#f48c25] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[#f48c25]/20 border-2 border-[#f48c25] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#f48c25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Checklist</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{checklistDone}/{checklistTotal}</p>
        </div>
      </section>

      {/* Progress Bar */}
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

      {/* 한줄 후기 (완료 여행) — 인라인 편집 */}
      {isCompleted && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-[3px] border-slate-900 retro-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Mission Review</h3>
            {!editingMemo && <EditButton onClick={startEditMemo} />}
          </div>
          {editingMemo ? (
            <>
              <textarea
                value={draftMemo}
                onChange={(e) => setDraftMemo(e.target.value)}
                placeholder="이 여행 어땠어요?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
              />
              <SaveCancelButtons onSave={saveMemoInline} onCancel={() => setEditingMemo(false)} saving={saving} />
            </>
          ) : trip.memo ? (
            <p className="text-slate-900 dark:text-slate-100 font-medium italic">"{trip.memo}"</p>
          ) : (
            <p
              onClick={startEditMemo}
              className="text-slate-300 text-sm font-medium italic cursor-pointer hover:text-[#f48c25] transition-colors"
            >
              탭하여 후기를 작성해보세요
            </p>
          )}
        </div>
      )}

      {/* 콘텐츠 섹션들 */}
      <div className="space-y-6">
        {/* 사진 — 인라인 편집 */}
        {editingPhotos ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Photos</h3>
            <PhotoUpload
              photos={draftPhotos}
              onChange={setDraftPhotos}
              coverImage={draftCover}
              onCoverChange={setDraftCover}
            />
            <SaveCancelButtons onSave={savePhotosInline} onCancel={() => setEditingPhotos(false)} saving={saving} />
          </div>
        ) : trip.photos.length > 0 ? (
          <div className="relative">
            <div className="absolute top-5 right-5 z-10">
              <EditButton onClick={startEditPhotos} />
            </div>
            <PhotoGallery photos={trip.photos} />
          </div>
        ) : (
          <div
            onClick={startEditPhotos}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Photos</h3>
            <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 사진을 추가해보세요</p>
          </div>
        )}

        {isCompleted && trip.itinerary.length > 0 && <Timeline items={trip.itinerary} />}

        {/* 장소 (계획 여행) — 인라인 편집 */}
        {!isCompleted && (
          editingPlaces ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Route & Places</h3>
                <button
                  type="button"
                  onClick={addDraftPlace}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
                >
                  + Add
                </button>
              </div>
              {draftPlaces.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 등록된 장소가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {draftPlaces.map((place, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        type="text"
                        value={place.name}
                        onChange={(e) => updateDraftPlace(i, 'name', e.target.value)}
                        placeholder="장소명"
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                      />
                      <select
                        value={place.priority}
                        onChange={(e) => updateDraftPlace(i, 'priority', e.target.value)}
                        className="w-20 shrink-0 px-2 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                      >
                        {PLACE_PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDraftPlace(i)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer mt-0.5 bg-transparent border-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <SaveCancelButtons onSave={savePlacesInline} onCancel={() => setEditingPlaces(false)} saving={saving} />
            </div>
          ) : trip.places.length > 0 ? (
            <div className="relative">
              <div className="absolute top-5 right-5 z-10">
                <EditButton onClick={startEditPlaces} />
              </div>
              <PlaceList places={trip.places} />
            </div>
          ) : (
            <div
              onClick={startEditPlaces}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Route & Places</h3>
              <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 장소를 추가해보세요</p>
            </div>
          )
        )}

        {/* 경비 — 인라인 편집 */}
        {editingExpenses ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                {isCompleted ? 'Expenses' : 'Est. Budget'}
              </h3>
              <button
                type="button"
                onClick={addDraftExpense}
                className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
              >
                + Add
              </button>
            </div>
            {draftExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 경비 항목이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {draftExpenses.map((expense, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <select
                      value={expense.category}
                      onChange={(e) => updateDraftExpense(i, 'category', e.target.value)}
                      className="w-24 shrink-0 px-2 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{expenseCategoryLabel(cat)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={expense.amount || ''}
                      onChange={(e) => updateDraftExpense(i, 'amount', Number(e.target.value))}
                      placeholder="금액"
                      min={0}
                      className="w-24 shrink-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                    />
                    <input
                      type="text"
                      value={expense.label}
                      onChange={(e) => updateDraftExpense(i, 'label', e.target.value)}
                      placeholder="설명"
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftExpense(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer mt-0.5 bg-transparent border-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <SaveCancelButtons onSave={saveExpensesInline} onCancel={() => setEditingExpenses(false)} saving={saving} />
          </div>
        ) : trip.expenses.length > 0 ? (
          <div className="relative">
            <div className="absolute top-5 right-5 z-10">
              <EditButton onClick={startEditExpenses} />
            </div>
            <ExpenseTable expenses={trip.expenses} isEstimate={!isCompleted} />
          </div>
        ) : (
          <div
            onClick={startEditExpenses}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">
              {isCompleted ? 'Expenses' : 'Est. Budget'}
            </h3>
            <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 경비를 추가해보세요</p>
          </div>
        )}

        {/* 체크리스트 — 인라인 편집 */}
        {editingChecklist ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Checklist</h3>
              <button
                type="button"
                onClick={addDraftChecklistItem}
                className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
              >
                + Add
              </button>
            </div>
            {draftChecklist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 체크리스트가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {draftChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateDraftChecklistText(i, e.target.value)}
                      placeholder="예: 항공편 예약"
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftChecklistItem(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <SaveCancelButtons onSave={saveChecklistInline} onCancel={() => setEditingChecklist(false)} saving={saving} />
          </div>
        ) : trip.checklist.length > 0 ? (
          <div className="relative">
            <div className="absolute top-5 right-5 z-10">
              <EditButton onClick={startEditChecklist} />
            </div>
            <Checklist items={trip.checklist} onToggle={handleChecklistToggle} />
          </div>
        ) : (
          <div
            onClick={startEditChecklist}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Checklist</h3>
            <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 체크리스트를 추가해보세요</p>
          </div>
        )}

        {/* 계획 여행: 메모 — 인라인 편집 */}
        {!isCompleted && (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-[3px] border-slate-900 retro-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Mission Notes</h3>
              {!editingMemo && <EditButton onClick={startEditMemo} />}
            </div>
            {editingMemo ? (
              <>
                <textarea
                  value={draftMemo}
                  onChange={(e) => setDraftMemo(e.target.value)}
                  placeholder="여행에 대한 메모를 남겨보세요..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
                />
                <SaveCancelButtons onSave={saveMemoInline} onCancel={() => setEditingMemo(false)} saving={saving} />
              </>
            ) : trip.memo ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{trip.memo}</p>
            ) : (
              <p
                onClick={startEditMemo}
                className="text-xs text-slate-300 font-medium text-center py-4 cursor-pointer hover:text-[#f48c25] transition-colors"
              >
                탭하여 메모를 추가해보세요
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
