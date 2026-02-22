import { useState, useEffect, useCallback } from 'react';
import type { TripStatus } from '../types/trip';
import { isSupabaseConfigured } from '../lib/supabase';
import { createTrip } from '../hooks/useTrips';
import { addDemoTrip } from '../hooks/useTrips';
import { createPin, addDemoPin } from '../hooks/usePins';
import DestinationPicker, { EMPTY_DESTINATION, type DestinationInfo } from './DestinationPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripFormModal({ open, onClose, onSaved }: Props) {
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

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);

      const saveDemoTrip = () => {
        const now = new Date().toISOString();
        const tripId = `demo-${Date.now()}`;
        addDemoTrip({
          id: tripId,
          title: title.trim(),
          destination: destination.name,
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
          createdAt: now,
          updatedAt: now,
        });
        // 여행지 좌표가 있으면 데모 핀도 생성
        if (destination.lat != null && destination.lng != null) {
          addDemoPin({
            id: `pin-demo-${Date.now()}`,
            user_id: 'demo-user-001',
            trip_id: tripId,
            name: destination.name || destination.city || '여행지',
            address: '',
            lat: destination.lat,
            lng: destination.lng,
            country: destination.country,
            city: destination.city,
            visit_status: status === 'completed' ? 'visited' : 'planned',
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

      if (isSupabaseConfigured) {
        try {
          const tripId = await createTrip({
            title: title.trim(),
            status,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            memo: memo.trim() || undefined,
          });
          // 여행지 좌표가 있으면 핀 생성
          if (destination.lat != null && destination.lng != null) {
            try {
              await createPin({
                name: destination.name || destination.city || '여행지',
                lat: destination.lat,
                lng: destination.lng,
                country: destination.country,
                city: destination.city,
                visit_status: status === 'completed' ? 'visited' : 'planned',
                visited_at: status === 'completed' ? (startDate || undefined) : undefined,
                category: 'landmark',
                trip_id: tripId,
              });
              window.dispatchEvent(new CustomEvent('pin-added'));
            } catch {
              // 핀 생성 실패해도 여행은 저장됨
            }
          }
        } catch {
          // Supabase 실패 시 데모 모드로 폴백
          saveDemoTrip();
        }
      } else {
        saveDemoTrip();
      }

      // useTrips refetch 트리거
      window.dispatchEvent(new CustomEvent('trip-added'));
      onSaved();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다');
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
        className={`bg-[#F9F4E8] w-full sm:max-w-lg sm:rounded-[32px] rounded-t-[32px] max-h-[85vh] overflow-y-auto border-4 border-[#2D3436] sm:shadow-[8px_8px_0px_0px_#2D3436] transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0'
        }`}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-[#F9F4E8] px-6 pt-5 pb-3 border-b-4 border-[#2D3436] z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#2D3436]">
              New Planet
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-[#2D3436] bg-white shadow-[2px_2px_0px_0px_#2D3436] hover:bg-[#FF6B6B]/10 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-[#2D3436]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* 드래그 핸들 (모바일) */}
          <div className="sm:hidden flex justify-center mt-2">
            <div className="w-12 h-1.5 rounded-full bg-[#2D3436]/20" />
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* 상태 선택 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-2">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-tight transition-all cursor-pointer border-2 border-[#2D3436] ${
                  status === 'planned'
                    ? 'bg-[#FFD166] text-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436]'
                    : 'bg-white text-[#2D3436]/40 shadow-none'
                }`}
              >
                계획 중
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-tight transition-all cursor-pointer border-2 border-[#2D3436] ${
                  status === 'completed'
                    ? 'bg-[#4ECDC4] text-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436]'
                    : 'bg-white text-[#2D3436]/40 shadow-none'
                }`}
              >
                완료
              </button>
            </div>
          </div>

          {/* 여행 제목 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-2">
              Title <span className="text-[#FF6B6B]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 도쿄 벚꽃 여행"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-[#2D3436] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-[#FF6B6B]"
            />
          </div>

          {/* 여행지 선택 (지도) */}
          <DestinationPicker value={destination} onChange={handleDestinationChange} />

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-2">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2D3436] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-[#FF6B6B]"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-2">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2D3436] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-[#FF6B6B]"
              />
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-[#2D3436]/60 mb-2">
              {status === 'completed' ? 'Review' : 'Memo'}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={status === 'completed' ? '이 여행 어땠어요?' : '여행에 대한 메모...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#2D3436] text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-[#FF6B6B] resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight text-[#2D3436]/60 bg-white border-2 border-[#2D3436] hover:bg-gray-50 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight text-white bg-[#FF6B6B] border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_#2D3436] hover:bg-[#e85d5d] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Launch Planet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
