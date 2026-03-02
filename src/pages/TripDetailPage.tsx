import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTrip, deleteTrip, toggleChecklistItem, saveExpenses, saveChecklistItems, savePlaces, updateDemoTrip, deleteDemoTrip } from '../hooks/useTrips';
import { supabase } from '../lib/supabase';
import { uploadTripPhoto, deleteTripPhoto } from '../lib/storage';
import { useSharesForTrip, createShare, removeShare, updateSharePermission } from '../hooks/useShares';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUpload from '../components/PhotoUpload';
import ConfirmModal from '../components/ConfirmModal';
import PlaceSearchModal from '../components/PlaceSearchModal';
import { TripDetailSkeleton } from '../components/Skeleton';
import { formatDate, calcDuration, totalExpenses, formatCurrency, expenseCategoryLabel } from '../utils/format';
import type { Expense, ExpenseCategory, ChecklistItem, Place } from '../types/trip';
import type { SharePermission } from '../types/database';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'flight', 'hotel', 'food', 'transport', 'activity', 'shopping', 'other',
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
  const { trip, loading, error, refetch, isDemo } = useTrip(id);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { shares, loading: sharesLoading } = useSharesForTrip(id);
  const { rate: exchangeRate, loading: rateLoading } = useExchangeRate(
    trip?.status === 'planned' ? trip?.destination : undefined,
  );
  const printRef = useRef<HTMLDivElement>(null);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<SharePermission>('read');
  const [inviting, setInviting] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const handleInvite = async () => {
    if (!id || !inviteEmail.trim()) return;
    if (!user) {
      toast('로그인이 필요합니다', 'error');
      return;
    }
    try {
      setInviting(true);
      if (isDemo) {
        // 데모 여행은 데모 공유 함수 사용
        const { createDemoShareDirect } = await import('../hooks/useShares');
        createDemoShareDirect(id, user.id, inviteEmail.trim(), invitePermission, trip?.title);
      } else {
        await createShare(id, user.id, inviteEmail.trim(), invitePermission, trip?.title);
      }
      setInviteEmail('');
      toast('초대를 보냈습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '초대 실패', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveShare = (shareId: string) => {
    setConfirmModal({
      open: true,
      title: '공유 취소',
      message: '이 공유를 취소하시겠습니까?',
      confirmLabel: '취소하기',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        try {
          await removeShare(shareId);
          toast('공유가 취소되었습니다');
        } catch (err) {
          toast(err instanceof Error ? err.message : '삭제 실패', 'error');
        }
      },
    });
  };

  const handlePermissionChange = async (shareId: string, perm: SharePermission) => {
    try {
      await updateSharePermission(shareId, perm);
      toast('권한이 변경되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '권한 변경 실패', 'error');
    }
  };

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
      if (isDemo) {
        updateDemoTrip(id, { photos: draftPhotos, coverImage: draftCover });
      } else {
        // 기존 Storage 사진 vs 새 사진 구분
        const existingPhotos = new Set(trip.photos);
        const urlMap = new Map<string, string>(); // 원본 URL → Storage URL 매핑

        // 새 사진을 Supabase Storage에 업로드
        for (const photo of draftPhotos) {
          if (!existingPhotos.has(photo)) {
            const storageUrl = await uploadTripPhoto(id, photo);
            urlMap.set(photo, storageUrl);
          }
        }

        // 삭제된 사진을 Storage에서 제거
        const removedPhotos = trip.photos.filter((p) => !draftPhotos.includes(p));
        for (const url of removedPhotos) {
          try { await deleteTripPhoto(id, url); } catch { /* ignore */ }
        }

        // 대표 이미지 업데이트 (새로 업로드된 경우 Storage URL 사용)
        const finalCover = urlMap.get(draftCover) || draftCover;
        await supabase.from('trips').update({ cover_image: finalCover }).eq('id', id).eq('user_id', user?.id ?? '');
      }
      setEditingPhotos(false);
      refetch();
      toast('사진이 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Checklist Toggle (demo + supabase) ---
  const handleChecklistToggle = async (index: number) => {
    if (!trip || !id) return;
    const item = trip.checklist[index];
    if (!item) return;

    if (isDemo) {
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
  const handleDelete = () => {
    if (!id) return;
    setConfirmModal({
      open: true,
      title: '여행 삭제',
      message: '이 여행을 삭제하시겠습니까? 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        try {
          setDeleting(true);
          if (isDemo) {
            deleteDemoTrip(id);
            window.dispatchEvent(new CustomEvent('trip-added'));
          } else {
            await deleteTrip(id);
          }
          navigate('/');
        } catch (err) {
          toast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
          setDeleting(false);
        }
      },
    });
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
      if (isDemo) {
        updateDemoTrip(id, { expenses: valid });
      } else {
        try {
          await saveExpenses(id, valid);
        } catch (err) {
          console.error('[saveExpenses] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(id, { expenses: valid });
        }
      }
      setEditingExpenses(false);
      refetch();
      toast('경비가 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
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
      if (isDemo) {
        updateDemoTrip(id, { checklist: valid });
      } else {
        try {
          await saveChecklistItems(id, valid);
        } catch (err) {
          console.error('[saveChecklist] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(id, { checklist: valid });
        }
      }
      setEditingChecklist(false);
      refetch();
      toast('체크리스트가 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Places inline edit (Day별 일정) ---
  const getTripDays = (): number => {
    if (!trip) return 1;
    const s = new Date(trip.startDate).getTime();
    const e = new Date(trip.endDate).getTime();
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  };
  const formatDayDate = (day: number): string => {
    if (!trip) return '';
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + day - 1);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}.${d.getDate()} (${weekdays[d.getDay()]})`;
  };
  const startEditPlaces = () => {
    if (!trip) return;
    if (trip.places.length > 0) {
      // 기존 장소 중 day가 없는 것은 Day 1에 배치 (편집 모드에서 보이도록)
      const places = trip.places.map((p) => ({
        ...p,
        day: p.day && p.day > 0 ? p.day : 1,
      }));
      setDraftPlaces(places);
    } else {
      // 첫 편집 시 Day 1에 빈 장소 하나 생성
      setDraftPlaces([{ name: '', priority: 'want', note: '', day: 1 }]);
    }
    setEditingPlaces(true);
  };
  const addDraftPlace = (day: number) => setDraftPlaces((prev) => [...prev, { name: '', priority: 'want', note: '', day, time: '' }]);
  const removeDraftPlace = (i: number) => setDraftPlaces((prev) => prev.filter((_, idx) => idx !== i));
  const updateDraftPlace = (i: number, field: keyof Place, value: string | number) => {
    setDraftPlaces((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };
  // 장소검색 모달 (선택 옵션)
  const [searchingPlaceIdx, setSearchingPlaceIdx] = useState<number | null>(null);
  const openPlaceSearch = (idx: number) => {
    setSearchingPlaceIdx(idx);
  };
  const handlePlaceSearchSelect = (lat: number, lng: number, name?: string) => {
    if (searchingPlaceIdx == null) return;
    setDraftPlaces((prev) => prev.map((p, i) => i === searchingPlaceIdx ? { ...p, lat, lng, ...(name ? { name } : {}) } : p));
    setSearchingPlaceIdx(null);
    toast('장소 정보가 등록되었습니다');
  };
  const clearPlaceLocation = (idx: number) => {
    setDraftPlaces((prev) => prev.map((p, i) => i === idx ? { ...p, lat: undefined, lng: undefined } : p));
  };
  const savePlacesInline = async () => {
    if (!trip || !id) return;
    // day가 유효한 장소만 저장 (미배정 장소 제거)
    const valid = draftPlaces.filter((p) => p.name.trim() && p.day && p.day > 0);
    try {
      setSaving(true);
      if (isDemo) {
        updateDemoTrip(id, { places: valid });
      } else {
        try {
          await savePlaces(id, valid);
        } catch (err) {
          console.error('[savePlaces] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(id, { places: valid });
        }
      }
      setEditingPlaces(false);
      refetch();
      window.dispatchEvent(new CustomEvent('pin-added'));
      toast('일정이 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
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
      if (isDemo) {
        updateDemoTrip(id, { memo: draftMemo.trim() });
      } else {
        await supabase.from('trips').update({ memo: draftMemo.trim() }).eq('id', id).eq('user_id', user?.id ?? '');
      }
      setEditingMemo(false);
      refetch();
      toast('메모가 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 에러가 있지만 폴백 데이터가 있으면 토스트로 알림만 표시
  useEffect(() => {
    if (error && trip) {
      toast(error, 'error');
    }
  }, [error, trip, toast]);

  if (loading) {
    return <TripDetailSkeleton />;
  }

  if (error && !trip) {
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

  // PDF 내보내기 (인쇄 기반)
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div ref={printRef} className="max-w-md mx-auto px-4 pt-4 space-y-6 pb-24">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-400 hover:text-[#f48c25] transition-colors bg-transparent border-0 p-0 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* 프로필 스타일 헤더 */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-[3px] border-slate-900 overflow-hidden bg-white retro-shadow relative z-10">
            {trip.coverImage ? (
              <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-teal-100 dark:from-orange-900/30 dark:to-teal-900/30">
                <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
            )}
          </div>
          <div className={`absolute -bottom-2 -right-2 border-[3px] border-slate-900 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest z-20 ${
            isCompleted ? 'bg-[#0d9488] text-white' : trip.status === 'wishlist' ? 'bg-[#6366f1] text-white' : 'bg-[#eab308] text-slate-900'
          }`}>
            {isCompleted ? 'Visited' : trip.status === 'wishlist' ? 'Wish' : 'Planned'}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase italic">{trip.title}</h2>
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

        {/* 실시간 환율 정보 (계획 중인 여행에만 표시) */}
        {trip.status === 'planned' && exchangeRate && (
          <div className="w-full bg-gradient-to-r from-[#0d9488]/10 to-[#eab308]/10 border-2 border-[#0d9488]/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0d9488]/20 flex items-center justify-center">
                <span className="text-xs font-bold text-[#0d9488]">{exchangeRate.symbol}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exchange Rate</p>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{exchangeRate.currencyName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#0d9488]">
                {exchangeRate.symbol}{(exchangeRate.rate * 10000).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">= 10,000원 ({exchangeRate.updatedAt})</p>
            </div>
          </div>
        )}
        {trip.status === 'planned' && rateLoading && (
          <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        )}

        {/* 수정/공유/삭제/PDF 버튼 */}
        <div className="flex gap-3 w-full">
          <Link
            to={`/trip/edit/${trip.id}`}
            className="flex-1 bg-[#f48c25] hover:bg-[#f48c25]/90 text-white font-bold py-3 px-6 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 uppercase tracking-widest text-sm text-center no-underline"
          >
            Edit Mission
          </Link>
          <button
            onClick={() => setShareModalOpen(true)}
            className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white font-bold py-3 px-4 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={handleExportPdf}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-3 px-4 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 cursor-pointer print:hidden"
            title="PDF 내보내기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-3 px-4 rounded-xl border-[3px] border-slate-900 retro-shadow transition-transform active:translate-y-0.5 active:translate-x-0.5 cursor-pointer disabled:opacity-50 print:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* 공유 크루 패널 */}
        {shares.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-600 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Crew ({shares.length})</p>
              {/* 수락된 크루 아바타 스택 */}
              <div className="flex -space-x-2">
                {shares.filter((s) => s.status === 'accepted').slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="w-6 h-6 rounded-full bg-[#0d9488] text-white flex items-center justify-center text-[9px] font-bold border-2 border-white dark:border-slate-800"
                    title={s.invited_email}
                  >
                    {s.invited_email[0].toUpperCase()}
                  </div>
                ))}
                {shares.filter((s) => s.status === 'accepted').length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-slate-800">
                    +{shares.filter((s) => s.status === 'accepted').length - 5}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shares.map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'accepted'
                      ? 'bg-[#0d9488]/10 text-[#0d9488]'
                      : s.status === 'pending'
                      ? 'bg-[#eab308]/10 text-[#eab308]'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.status === 'accepted' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] animate-pulse" />
                  )}
                  {s.invited_email.split('@')[0]}
                  <span className="opacity-60">{s.permission === 'edit' ? '편집' : '읽기'}</span>
                  {s.status === 'pending' && <span className="opacity-50 italic">대기</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 공유 모달 */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShareModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border-[3px] border-slate-900 retro-shadow p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Share Mission</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 초대 폼 */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Invite</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                />
                <select
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as SharePermission)}
                  className="w-20 shrink-0 px-2 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                >
                  <option value="read">읽기</option>
                  <option value="edit">편집</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#0d9488] border-2 border-slate-900 retro-shadow hover:bg-[#0d9488]/90 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {inviting ? '초대 중...' : '초대 보내기'}
              </button>
            </div>

            {/* 공유 목록 */}
            {shares.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Shared With</p>
                <div className="space-y-2">
                  {shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-[#F9F4E8] dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          s.status === 'accepted' ? 'bg-[#0d9488] text-white' : 'bg-[#eab308] text-slate-900'
                        }`}>
                          {s.invited_email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{s.invited_email}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {s.status === 'pending' ? '수락 대기중' : s.status === 'accepted' ? '수락됨' : '거절됨'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={s.permission}
                          onChange={(e) => handlePermissionChange(s.id, e.target.value as SharePermission)}
                          className="px-2 py-1 rounded-lg border-2 border-slate-300 text-[10px] font-bold bg-white focus:outline-none"
                        >
                          <option value="read">읽기</option>
                          <option value="edit">편집</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveShare(s.id)}
                          className="text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shares.length === 0 && !sharesLoading && (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🔗</p>
                <p className="text-sm text-slate-400 font-medium">아직 공유된 사람이 없습니다</p>
                <p className="text-xs text-slate-300 mt-1">이메일로 초대하여 함께 여행을 계획해보세요!</p>
              </div>
            )}
          </div>
        </div>
      )}

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
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Schedule</p>
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

        {/* 일정 & 장소 — Day별 인라인 편집 */}
        {editingPlaces ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Daily Schedule</h3>
            <div className="space-y-5">
              {Array.from({ length: getTripDays() }, (_, di) => di + 1).map((day) => {
                const dayPlaces = draftPlaces
                  .map((p, idx) => ({ ...p, _idx: idx }))
                  .filter((p) => p.day === day);
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#f48c25] border-2 border-slate-900 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">D{day}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Day {day}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{formatDayDate(day)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addDraftPlace(day)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-2.5 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
                      >
                        + Add
                      </button>
                    </div>
                    {dayPlaces.length === 0 ? (
                      <p className="text-[10px] text-slate-300 font-medium text-center py-3 ml-10 border-l-2 border-[#f48c25]/20">일정 없음</p>
                    ) : (
                      <div className="space-y-2 ml-3 pl-3 border-l-2 border-[#f48c25]/30">
                        {dayPlaces.map((place) => (
                          <div key={place._idx} className="bg-[#F9F4E8] dark:bg-slate-700 p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 space-y-1.5">
                            {/* 1행: 일정명 + 삭제 */}
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#f48c25] shrink-0" />
                              <input
                                type="text"
                                value={place.name}
                                onChange={(e) => updateDraftPlace(place._idx, 'name', e.target.value)}
                                placeholder="일정명"
                                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border-2 border-slate-300 text-xs font-medium bg-white dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
                              />
                              <button
                                type="button"
                                onClick={() => removeDraftPlace(place._idx)}
                                className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {/* 2행: 비고 + 장소 정보 (선택) */}
                            <div className="flex items-center gap-1.5 ml-3.5">
                              <input
                                type="text"
                                value={place.note || ''}
                                onChange={(e) => updateDraftPlace(place._idx, 'note', e.target.value)}
                                placeholder="비고 (선택)"
                                className="flex-1 min-w-0 px-2.5 py-1 rounded-lg border-2 border-slate-200 text-[10px] font-medium bg-white dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
                              />
                              {place.lat != null && place.lng != null ? (
                                <button
                                  type="button"
                                  onClick={() => clearPlaceLocation(place._idx)}
                                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-[#0d9488] bg-[#0d9488]/10 text-[10px] font-bold text-[#0d9488] hover:bg-[#0d9488]/20 transition-colors cursor-pointer"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  등록됨
                                  <svg className="w-2.5 h-2.5 text-[#0d9488]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPlaceSearch(place._idx)}
                                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-slate-300 text-[10px] font-bold text-slate-400 hover:border-[#f48c25] hover:text-[#f48c25] transition-colors cursor-pointer bg-transparent"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  장소검색
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <SaveCancelButtons onSave={savePlacesInline} onCancel={() => setEditingPlaces(false)} saving={saving} />
          </div>
        ) : trip.places.length > 0 ? (
          <div className="relative">
            <div className="absolute top-5 right-5 z-10">
              <EditButton onClick={startEditPlaces} />
            </div>
            <PlaceList places={trip.places} startDate={trip.startDate} />
          </div>
        ) : (
          <div
            onClick={startEditPlaces}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Daily Schedule</h3>
            <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 Day별 일정을 추가해보세요</p>
          </div>
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
          <Checklist items={trip.checklist} onToggle={handleChecklistToggle} action={<EditButton onClick={startEditChecklist} />} />
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

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, open: false }))}
      />

      {searchingPlaceIdx != null && (
        <PlaceSearchModal
          initialQuery={draftPlaces[searchingPlaceIdx]?.name?.trim() || ''}
          onSelect={handlePlaceSearchSelect}
          onClose={() => setSearchingPlaceIdx(null)}
        />
      )}
    </div>
  );
}
