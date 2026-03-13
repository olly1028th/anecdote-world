import { useState, useEffect, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { TripStatus } from '../types/trip';
import { isSupabaseConfigured } from '../lib/supabase';
import { createTrip } from '../hooks/useTrips';
import { addDemoTrip } from '../hooks/useTrips';
import { createPin, addDemoPin } from '../hooks/usePins';
import { useToast } from '../contexts/ToastContext';
import { DEMO_USER_ID } from '../contexts/AuthContext';
import { tripStatusToPinStatus } from '../utils/statusConvert';
import DestinationPicker from './DestinationPicker';
import { EMPTY_DESTINATION } from '../types/destination';
import type { DestinationInfo } from '../types/destination';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripFormModal({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TripStatus>('planned');
  const [destination, setDestination] = useState<DestinationInfo>(EMPTY_DESTINATION);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleDestinationChange = useCallback((info: DestinationInfo) => {
    setDestination(info);
  }, []);

  // 열릴 때 애니메이션
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // 폼 초기화
  useEffect(() => {
    if (open) {
      setTitle('');
      setStatus('planned');
      setDestination(EMPTY_DESTINATION);
      setStartDate('');
      setEndDate('');
      setMemo('');
      setSaving(false);
    }
  }, [open]);

  const dialogRef = useFocusTrap(open && !saving ? onClose : undefined);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);

      const finalDest = destination;

      const saveDemoTrip = () => {
        const now = new Date().toISOString();
        const tripId = `demo-${Date.now()}`;
        addDemoTrip({
          id: tripId,
          title: title.trim(),
          destination: finalDest.name,
          country: finalDest.country || undefined,
          status,
          startDate: startDate || '',
          endDate: endDate || '',
          coverImage: '',
          memo: memo.trim(),
          expenses: [],
          itinerary: [],
          photos: [],
          places: [],
          checklist: [],
          documents: [],
          travelerCount: 1,
          createdAt: now,
          updatedAt: now,
        });
        if (finalDest.lat != null && finalDest.lng != null) {
          addDemoPin({
            id: `pin-demo-${Date.now()}`,
            user_id: DEMO_USER_ID,
            trip_id: tripId,
            name: finalDest.name || finalDest.city || '여행지',
            address: '',
            lat: finalDest.lat,
            lng: finalDest.lng,
            country: finalDest.country,
            city: finalDest.city,
            visit_status: tripStatusToPinStatus(status),
            visited_at: status === 'completed' ? (startDate || null) : null,
            category: 'landmark',
            rating: null,
            note: '',
            day_number: null,
            sort_order: 0,
            created_at: now,
            updated_at: now,
          });
          window.dispatchEvent(new CustomEvent('pin-added'));
        }
      };

      let supabaseSaved = false;
      if (isSupabaseConfigured) {
        try {
          const tripId = await createTrip({
            title: title.trim(),
            status,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            memo: memo.trim() || undefined,
            country: finalDest.country || undefined,
          });
          supabaseSaved = true;
          if (finalDest.lat != null && finalDest.lng != null) {
            try {
              await createPin({
                name: finalDest.name || finalDest.city || '여행지',
                lat: finalDest.lat,
                lng: finalDest.lng,
                country: finalDest.country,
                city: finalDest.city,
                visit_status: tripStatusToPinStatus(status),
                visited_at: status === 'completed' ? (startDate || undefined) : undefined,
                category: 'landmark',
                trip_id: tripId,
              });
            } catch (pinErr) {
              // 핀 Supabase 저장 실패 → localStorage에 fallback 저장
              console.error('[TripFormModal] 핀 Supabase 저장 실패:', pinErr);
              const now = new Date().toISOString();
              addDemoPin({
                id: `pin-demo-${Date.now()}`,
                user_id: DEMO_USER_ID,
                trip_id: tripId,
                name: finalDest.name || finalDest.city || '여행지',
                address: '',
                lat: finalDest.lat,
                lng: finalDest.lng,
                country: finalDest.country,
                city: finalDest.city,
                visit_status: tripStatusToPinStatus(status),
                visited_at: status === 'completed' ? (startDate || null) : null,
                category: 'landmark',
                rating: null,
                note: '',
                day_number: null,
                sort_order: 0,
                created_at: now,
                updated_at: now,
              });
            }
            window.dispatchEvent(new CustomEvent('pin-added'));
          }
        } catch (tripErr) {
          console.error('[TripFormModal] 여행 Supabase 저장 실패:', tripErr);
          saveDemoTrip();
        }
      } else {
        saveDemoTrip();
      }

      window.dispatchEvent(new CustomEvent('trip-added'));
      onSaved();
      onClose();
      toast(
        supabaseSaved ? '여행이 생성되었습니다' : '서버 저장 실패 — 로컬에 임시 저장되었습니다',
        supabaseSaved ? 'success' : 'error',
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="New Planet"
        tabIndex={-1}
        className={`bg-[#F9F4E8] dark:bg-[#1a1208] w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[85dvh] overflow-y-auto border-[3px] border-slate-900 dark:border-[#4a3f35] sm:retro-shadow transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0'
        }`}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-[#F9F4E8] dark:bg-[#1a1208] px-6 pt-5 pb-3 border-b-[3px] border-slate-900 dark:border-[#4a3f35] z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold italic uppercase tracking-tighter text-[#1c140d] dark:text-slate-100">
              New Planet
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] bg-white dark:bg-[#2a1f15] shadow-[2px_2px_0px_0px_#1c140d] dark:shadow-[2px_2px_0px_0px_rgba(74,63,53,0.5)] hover:bg-[#f48c25]/10 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              aria-label="모달 닫기"
            >
              <svg className="w-5 h-5 text-[#1c140d] dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="sm:hidden flex justify-center mt-2">
            <div className="w-12 h-1.5 rounded-full bg-[#1c140d]/20 dark:bg-slate-600" />
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* 상태 선택 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 dark:border-[#4a3f35] ${
                  status === 'planned'
                    ? 'bg-[#eab308] text-[#1c140d] shadow-[3px_3px_0px_0px_#1c140d] dark:shadow-[3px_3px_0px_0px_rgba(74,63,53,0.5)]'
                    : 'bg-white dark:bg-[#2a1f15] text-[#1c140d]/40 dark:text-slate-400 shadow-none'
                }`}
              >
                계획 중
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 dark:border-[#4a3f35] ${
                  status === 'completed'
                    ? 'bg-[#0d9488] text-white shadow-[3px_3px_0px_0px_#1c140d] dark:shadow-[3px_3px_0px_0px_rgba(74,63,53,0.5)]'
                    : 'bg-white dark:bg-[#2a1f15] text-[#1c140d]/40 dark:text-slate-400 shadow-none'
                }`}
              >
                완료
              </button>
              <button
                type="button"
                onClick={() => setStatus('wishlist')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 dark:border-[#4a3f35] ${
                  status === 'wishlist'
                    ? 'bg-[#6366f1] text-white shadow-[3px_3px_0px_0px_#1c140d] dark:shadow-[3px_3px_0px_0px_rgba(74,63,53,0.5)]'
                    : 'bg-white dark:bg-[#2a1f15] text-[#1c140d]/40 dark:text-slate-400 shadow-none'
                }`}
              >
                위시
              </button>
            </div>
          </div>

          {/* 여행 제목 */}
          <div>
            <label htmlFor="trip-title" className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">
              Title <span className="text-[#f48c25]">*</span>
            </label>
            <input
              id="trip-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 도쿄 벚꽃 여행"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-sm font-medium bg-white dark:bg-[#2a1f15] text-[#1c140d] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
            />
          </div>

          {/* 여행지 선택 (지도) */}
          <DestinationPicker value={destination} onChange={handleDestinationChange} />

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-start-date" className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">Start</label>
              <input
                id="trip-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-sm font-medium bg-white dark:bg-[#2a1f15] text-[#1c140d] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="trip-end-date" className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">End</label>
              <input
                id="trip-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-sm font-medium bg-white dark:bg-[#2a1f15] text-[#1c140d] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label htmlFor="trip-memo" className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">
              {status === 'completed' ? 'Review' : 'Memo'}
            </label>
            <textarea
              id="trip-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={status === 'completed' ? '이 여행 어땠어요?' : '여행에 대한 메모...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-[#4a3f35] text-sm font-medium bg-white dark:bg-[#2a1f15] text-[#1c140d] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2 pb-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-tight text-[#1c140d]/60 dark:text-slate-400 bg-white dark:bg-[#2a1f15] border-2 border-slate-900 dark:border-[#4a3f35] hover:bg-gray-50 dark:hover:bg-[#1a1208] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 dark:border-[#4a3f35] retro-shadow hover:bg-[#e85d5d] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Launch Planet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
