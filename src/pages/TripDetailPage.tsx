import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTrip, deleteTrip, updateTrip, toggleChecklistItem, saveChecklistItems, saveDocuments, updateDemoTrip, deleteDemoTrip } from '../hooks/useTrips';
import { supabase } from '../lib/supabase';
import { savePhotoCaptions, saveTravelerCount as saveTravelerCountLocal, updateLocalPinsByTripId } from '../lib/localStore';
import { tripStatusToPinStatus } from '../utils/statusConvert';
import { uploadTripPhoto, deleteTripPhoto, uploadTripDocument, deleteTripDocument } from '../lib/storage';
import { useSharesForTrip } from '../hooks/useShares';
import { useLazyExchangeRate } from '../hooks/useExchangeRate';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ExpenseTable from '../components/ExpenseTable';
import Timeline from '../components/Timeline';
import PlaceList from '../components/PlaceList';
import Checklist from '../components/Checklist';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUpload from '../components/PhotoUpload';
import ConfirmModal from '../components/ConfirmModal';
import { useConfirmModal } from '../hooks/useConfirmModal';
import TripShareModal from '../components/TripShareModal';
import InlinePlacesEditor from '../components/InlinePlacesEditor';
import InlineExpenseEditor from '../components/InlineExpenseEditor';
import InlineDailySpendingEditor from '../components/InlineDailySpendingEditor';
import { EditButton, SaveCancelButtons } from '../components/InlineEditButtons';
import { TripDetailSkeleton } from '../components/Skeleton';
import { formatDate, calcDuration, totalExpensesInKRW, formatCurrency } from '../utils/format';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import type { ChecklistItem, TripDocument, TripStatus } from '../types/trip';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trip, loading, error, refetch, isDemo } = useTrip(id);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { shares, loading: sharesLoading } = useSharesForTrip(id);
  const { rate: exchangeRate, loading: rateLoading, error: rateError, fetch: fetchRate } = useLazyExchangeRate(trip?.destination, trip?.country);
  const printRef = useRef<HTMLDivElement>(null);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Confirm modal state
  const { confirmModal, setConfirmModal } = useConfirmModal();

  // Inline edit states
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingExpenses, setEditingExpenses] = useState(false);
  const [editingDailySpending, setEditingDailySpending] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [editingPlaces, setEditingPlaces] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState(false);
  const [editingTravelerCount, setEditingTravelerCount] = useState(false);
  const [draftTravelerCount, setDraftTravelerCount] = useState(1);

  // Edit form data (photos, checklist, memo — expenses/places are in extracted components)
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [draftCover, setDraftCover] = useState('');
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);
  const [draftDocuments, setDraftDocuments] = useState<TripDocument[]>([]);
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

  // --- 여행 상태 원클릭 전환 ---
  const [statusSaving, setStatusSaving] = useState(false);

  // 정복 완료 — 바로 completed로 전환
  const markAsCompleted = async () => {
    if (!trip || !id || statusSaving) return;
    try {
      setStatusSaving(true);
      if (isDemo) {
        updateDemoTrip(id, { status: 'completed' });
        updateLocalPinsByTripId(id, { visit_status: 'visited' });
      } else {
        await updateTrip(id, { status: 'completed' });
      }
      window.dispatchEvent(new CustomEvent('trip-added'));
      window.dispatchEvent(new CustomEvent('pin-added'));
      refetch();
      toast('정복 완료! 축하합니다!');
    } catch (err) {
      toast(err instanceof Error ? err.message : '상태 변경 실패', 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const cycleStatus = async () => {
    if (!trip || !id || statusSaving) return;
    const order: TripStatus[] = ['planned', 'completed', 'wishlist'];
    const currentIdx = order.indexOf(trip.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    try {
      setStatusSaving(true);
      if (isDemo) {
        updateDemoTrip(id, { status: nextStatus });
        updateLocalPinsByTripId(id, { visit_status: tripStatusToPinStatus(nextStatus) });
      } else {
        await updateTrip(id, { status: nextStatus });
      }
      window.dispatchEvent(new CustomEvent('trip-added'));
      window.dispatchEvent(new CustomEvent('pin-added'));
      refetch();
      const labels: Record<TripStatus, string> = { completed: '다녀왔어요', planned: '계획중', wishlist: '위시리스트' };
      toast(`상태가 "${labels[nextStatus]}"(으)로 변경되었습니다`);
    } catch (err) {
      toast(err instanceof Error ? err.message : '상태 변경 실패', 'error');
    } finally {
      setStatusSaving(false);
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
      let clOk = true;
      if (isDemo) {
        updateDemoTrip(id, { checklist: valid });
      } else {
        try {
          await saveChecklistItems(id, valid);
        } catch (err) {
          clOk = false;
          console.error('[saveChecklist] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(id, { checklist: valid });
        }
      }
      setEditingChecklist(false);
      refetch();
      toast(clOk ? '체크리스트가 저장되었습니다' : '서버 저장 실패 — 로컬에 임시 저장되었습니다', clOk ? 'success' : 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditPlaces = () => {
    if (!trip) return;
    setEditingPlaces(true);
  };
  const startEditExpenses = () => {
    if (!trip) return;
    setEditingExpenses(true);
  };

  // --- Documents inline edit ---
  const startEditDocuments = () => {
    if (!trip) return;
    setDraftDocuments([...(trip.documents ?? [])]);
    setEditingDocuments(true);
  };
  const saveDocumentsInline = async () => {
    if (!trip || !id) return;
    setSaving(true);
    try {
      // data URL 없는 빈 문서 필터링
      const validDocs = draftDocuments.filter((d) => d.url && d.name);
      const isDemoTrip = isDemo || id.startsWith('demo-');

      if (isDemoTrip) {
        updateDemoTrip(id, { documents: validDocs });
      } else {
        // Supabase 경로: Storage 업로드 + DB 저장
        const uploaded: TripDocument[] = [];
        for (const doc of validDocs) {
          if (doc.url.startsWith('data:')) {
            try {
              const res = await fetch(doc.url);
              const blob = await res.blob();
              const ext = doc.name.split('.').pop() || 'pdf';
              const file = new File([blob], doc.name, { type: blob.type || `application/${ext}` });
              const url = await uploadTripDocument(id, file);
              uploaded.push({ ...doc, url });
            } catch (e) {
              console.warn('[documents] Storage 업로드 실패, data URL 유지:', e);
              uploaded.push(doc);
            }
          } else {
            uploaded.push(doc);
          }
        }
        // 삭제된 문서의 Storage 파일 제거
        const newUrls = new Set(uploaded.map((d) => d.url));
        for (const old of (trip.documents ?? [])) {
          if (!newUrls.has(old.url) && !old.url.startsWith('data:')) {
            try { await deleteTripDocument(id, old.url); } catch { /* ignore */ }
          }
        }
        // DB 저장 시도 → 실패 시 로컬 fallback
        try {
          await saveDocuments(id, uploaded);
        } catch (e) {
          console.warn('[documents] DB 저장 실패, 로컬 fallback:', e);
          // data URL은 localStorage에 저장 시 용량 초과 → URL이 있는 것만 저장
          const saveable = uploaded.filter((d) => !d.url.startsWith('data:'));
          if (saveable.length > 0) {
            updateDemoTrip(id, { documents: saveable });
          }
        }
      }
      toast('서류가 저장되었습니다', 'success');
      setEditingDocuments(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : String(err);
      console.error('[documents] 문서 저장 실패:', err);
      // 최종 fallback: 파일 내용 제외하고 메타만 로컬 저장
      try {
        const metaOnly = draftDocuments.map((d) => ({
          ...d,
          url: d.url.startsWith('data:') ? '' : d.url,
        })).filter((d) => d.url);
        if (metaOnly.length > 0) {
          updateDemoTrip(id, { documents: metaOnly });
        }
        toast(`저장 오류: ${msg}`, 'error');
        setEditingDocuments(false);
        refetch();
      } catch {
        toast(`저장 오류: ${msg}`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Traveler count inline edit ---
  const startEditTravelerCount = () => {
    if (!trip) return;
    setDraftTravelerCount(trip.travelerCount || 1);
    setEditingTravelerCount(true);
  };
  const saveTravelerCount = async () => {
    if (!trip || !id) return;
    const count = Math.max(1, draftTravelerCount);
    try {
      setSaving(true);
      // localStorage에 항상 저장 (fallback)
      saveTravelerCountLocal(id, count);
      if (isDemo) {
        updateDemoTrip(id, { travelerCount: count });
      } else {
        // Supabase에 저장 (cross-device 동기화)
        const { error: dbErr } = await supabase.from('trips').update({ traveler_count: count }).eq('id', id).eq('user_id', user?.id ?? '');
        if (dbErr) console.warn('[saveTravelerCount] DB 저장 실패:', dbErr.message);
      }
      setEditingTravelerCount(false);
      refetch();
      toast('인원 수가 저장되었습니다');
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

  // --- 사진 캡션 저장 ---
  const handleCaptionChange = async (url: string, caption: string) => {
    if (!trip || !id) return;
    const updated = { ...(trip.photoCaptions ?? {}), [url]: caption };
    // 빈 캡션은 삭제
    if (!caption) delete updated[url];

    // 1. localStorage에 즉시 저장 (DB 컬럼 유무와 무관하게 항상 동작)
    savePhotoCaptions(id, updated);

    // 2. Supabase에도 저장 시도 (photo_captions 컬럼이 있으면 DB에도 반영)
    if (!isDemo && user) {
      try {
        await supabase.from('trips').update({ photo_captions: updated }).eq('id', id).eq('user_id', user.id);
      } catch {
        // DB 컬럼 미존재 시 무시 — localStorage에 이미 저장됨
      }
    }

    // 3. refetch하여 UI 갱신 (mapDbTripToUi에서 localStorage 캡션 병합)
    refetch();
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
              <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-teal-100 dark:from-orange-900/30 dark:to-teal-900/30">
                <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={cycleStatus}
            disabled={statusSaving}
            title="클릭하여 상태 전환"
            className={`absolute -bottom-2 -right-2 border-[3px] border-slate-900 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest z-20 cursor-pointer transition-all hover:scale-110 active:scale-95 disabled:opacity-50 ${
              isCompleted ? 'bg-[#0d9488] text-white' : trip.status === 'wishlist' ? 'bg-[#6366f1] text-white' : 'bg-[#eab308] text-slate-900'
            }`}
          >
            {isCompleted ? 'Visited' : trip.status === 'wishlist' ? 'Wish' : 'Planned'}
            <svg className="inline-block w-2.5 h-2.5 ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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

        {/* 환율 정보 — 버튼 클릭 시 조회 */}
        {exchangeRate ? (
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
                {exchangeRate.symbol}{(exchangeRate.rate * 1000).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">= 1,000원 ({exchangeRate.updatedAt})</p>
            </div>
          </div>
        ) : rateLoading ? (
          <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ) : (
          <button
            type="button"
            onClick={fetchRate}
            className="w-full py-2.5 rounded-xl text-sm font-bold tracking-tight text-[#0d9488] bg-[#0d9488]/10 border-2 border-[#0d9488]/30 hover:bg-[#0d9488]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {rateError === 'no_currency'
              ? `통화 감지 실패 (${trip.destination || '목적지 없음'})`
              : rateError === 'api_fail'
                ? '환율 API 조회 실패 — 다시 시도'
                : '환율 확인하기'}
          </button>
        )}

        {/* 정복 완료 배너 — 계획 여행의 종료일이 지났을 때 */}
        {trip.status === 'planned' && trip.endDate && new Date(trip.endDate) < new Date(new Date().toDateString()) && (
          <div className="w-full bg-gradient-to-r from-[#0d9488]/15 to-[#eab308]/15 border-[3px] border-[#0d9488] rounded-xl p-4 text-center space-y-2.5">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">여행 다녀오셨나요?</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              여행 종료일({formatDate(trip.endDate)})이 지났습니다
            </p>
            <button
              type="button"
              onClick={markAsCompleted}
              disabled={statusSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#0d9488] border-2 border-slate-900 retro-shadow hover:bg-[#0d9488]/90 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {statusSaving ? '변경 중...' : '정복 완료!'}
            </button>
          </div>
        )}

        {/* 정복 완료 버튼 — 모든 계획 여행에 표시 (종료일 미경과 포함) */}
        {trip.status === 'planned' && !(trip.endDate && new Date(trip.endDate) < new Date(new Date().toDateString())) && (
          <button
            type="button"
            onClick={markAsCompleted}
            disabled={statusSaving}
            className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#0d9488] border-2 border-slate-900 retro-shadow hover:bg-[#0d9488]/90 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {statusSaving ? '변경 중...' : '정복 완료!'}
          </button>
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
      <TripShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        tripId={id!}
        tripTitle={trip.title}
        isDemo={isDemo}
        shares={shares}
        sharesLoading={sharesLoading}
      />

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
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
            {trip.expenses.length > 0 ? formatCurrency(totalExpensesInKRW(trip.expenses, exchangeRate?.rate)) : '-'}
          </p>
        </div>

        {/* 인당 경비 카드 */}
        {(() => {
          const total = trip.expenses.length > 0 ? totalExpensesInKRW(trip.expenses, exchangeRate?.rate) : 0;
          const count = trip.travelerCount || 1;
          const perPerson = count > 0 ? Math.round(total / count) : 0;
          return (
            <div
              onClick={startEditTravelerCount}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border-[3px] border-slate-900 retro-shadow flex flex-col gap-2 cursor-pointer hover:border-[#f48c25] transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0d9488]/20 border-2 border-[#0d9488] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Cost / Person
                <span className="ml-1 text-[#0d9488]">({count}명)</span>
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {total > 0 ? formatCurrency(perPerson) : '-'}
              </p>
            </div>
          );
        })()}

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

      {/* 인원 수 인라인 편집 */}
      {editingTravelerCount && (
        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl border-[3px] border-[#0d9488] retro-shadow">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">함께 가는 인원</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraftTravelerCount(Math.max(1, draftTravelerCount - 1))}
              className="w-10 h-10 rounded-lg border-2 border-slate-900 bg-white dark:bg-slate-700 text-lg font-bold cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-center"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={draftTravelerCount}
              onChange={(e) => setDraftTravelerCount(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="w-16 text-center text-2xl font-bold rounded-lg border-2 border-slate-900 py-1.5 bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
            />
            <button
              type="button"
              onClick={() => setDraftTravelerCount(Math.min(99, draftTravelerCount + 1))}
              className="w-10 h-10 rounded-lg border-2 border-slate-900 bg-white dark:bg-slate-700 text-lg font-bold cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-center"
            >
              +
            </button>
            <span className="text-sm font-bold text-slate-500">명</span>
          </div>
          <SaveCancelButtons onSave={saveTravelerCount} onCancel={() => setEditingTravelerCount(false)} saving={saving} />
        </section>
      )}

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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
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
          <PhotoGallery
            photos={trip.photos}
            captions={trip.photoCaptions}
            onCaptionChange={handleCaptionChange}
            action={<EditButton onClick={startEditPhotos} />}
          />
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
          <InlinePlacesEditor
            trip={trip}
            tripId={id!}
            isDemo={isDemo}
            onDone={() => setEditingPlaces(false)}
            refetch={refetch}
          />
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

        {/* 예산 경비 — 인라인 편집 (카테고리별) */}
        {(() => {
          const budgetExpenses = trip.expenses.filter((e) => !e.spentAt);
          const dailyExpenses = trip.expenses.filter((e) => !!e.spentAt);
          return editingExpenses ? (
            <InlineExpenseEditor
              tripId={id!}
              isDemo={isDemo}
              isCompleted={isCompleted}
              initialExpenses={budgetExpenses}
              otherExpenses={dailyExpenses}
              onDone={() => setEditingExpenses(false)}
              refetch={refetch}
              destination={trip.destination}
              country={trip.country}
            />
          ) : budgetExpenses.length > 0 ? (
            <div className="relative">
              <div className="absolute top-5 right-5 z-10">
                <EditButton onClick={startEditExpenses} />
              </div>
              <ExpenseTable
                expenses={budgetExpenses}
                isEstimate={!isCompleted}
                exchangeRate={exchangeRate?.rate}
                currencySymbol={exchangeRate?.symbol}
                localCurrency={exchangeRate?.toCurrency}
              />
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
          );
        })()}

        {/* 일일 지출 — 인라인 편집 (Day별) */}
        {(() => {
          const budgetExpenses = trip.expenses.filter((e) => !e.spentAt);
          const dailyExpenses = trip.expenses.filter((e) => !!e.spentAt);
          return editingDailySpending ? (
            <InlineDailySpendingEditor
              tripId={id!}
              isDemo={isDemo}
              initialExpenses={dailyExpenses}
              otherExpenses={budgetExpenses}
              onDone={() => setEditingDailySpending(false)}
              refetch={refetch}
              destination={trip.destination}
              country={trip.country}
              startDate={trip.startDate}
              endDate={trip.endDate}
            />
          ) : dailyExpenses.length > 0 ? (
            <div className="relative">
              <div className="absolute top-5 right-5 z-10">
                <EditButton onClick={() => setEditingDailySpending(true)} />
              </div>
              <ExpenseTable
                expenses={dailyExpenses}
                title="Daily Spending"
                startDate={trip.startDate}
                exchangeRate={exchangeRate?.rate}
                currencySymbol={exchangeRate?.symbol}
                localCurrency={exchangeRate?.toCurrency}
              />
            </div>
          ) : (
            <div
              onClick={() => setEditingDailySpending(true)}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#0d9488] transition-colors"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#0d9488] mb-2">Daily Spending</h3>
              <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 일일 지출을 기록해보세요</p>
            </div>
          );
        })()}

        {/* 예약 서류 — 인라인 편집 */}
        {editingDocuments ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Reservations</h3>
            <DocumentUpload documents={draftDocuments} onChange={setDraftDocuments} />
            <SaveCancelButtons onSave={saveDocumentsInline} onCancel={() => setEditingDocuments(false)} saving={saving} />
          </div>
        ) : (trip.documents ?? []).length > 0 ? (
          <DocumentList
            documents={trip.documents}
            action={<EditButton onClick={startEditDocuments} />}
          />
        ) : (
          <div
            onClick={startEditDocuments}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-dashed border-slate-300 cursor-pointer hover:border-[#f48c25] transition-colors"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Reservations</h3>
            <p className="text-xs text-slate-300 font-medium text-center py-4">탭하여 예약 서류를 추가해보세요</p>
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
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
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

    </div>
  );
}
