import { useState, useEffect } from 'react';
import type { TripStatus } from '../types/trip';
import { isSupabaseConfigured } from '../lib/supabase';
import { createTrip } from '../hooks/useTrips';
import { addDemoTrip } from '../hooks/useTrips';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripFormModal({ open, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TripStatus>('planned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

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
        addDemoTrip({
          id: `demo-${Date.now()}`,
          title: title.trim(),
          destination: '',
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
      };

      if (isSupabaseConfigured) {
        try {
          await createTrip({
            title: title.trim(),
            status,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            memo: memo.trim() || undefined,
          });
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
        className={`bg-[var(--color-bg)] w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0'
        }`}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-[var(--color-bg)] px-6 pt-5 pb-3 border-b border-[var(--color-border)] z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2D3436]">새 여행 추가</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* 드래그 핸들 (모바일) */}
          <div className="sm:hidden flex justify-center mt-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* 상태 선택 */}
          <div>
            <label className="block text-sm font-medium text-[#4A4A4A] mb-2">상태</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                  status === 'planned'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white text-gray-500 border border-[#F0EEE6]'
                }`}
              >
                계획 중
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white text-gray-500 border border-[#F0EEE6]'
                }`}
              >
                완료
              </button>
            </div>
          </div>

          {/* 여행 제목 */}
          <div>
            <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
              여행 제목 <span className="text-[#FF6B6B]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 도쿄 벚꽃 여행"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-2xl border border-[#F0EEE6] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-transparent"
            />
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-2">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#F0EEE6] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-2">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#F0EEE6] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-transparent"
              />
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
              {status === 'completed' ? '한줄 후기' : '메모'}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={status === 'completed' ? '이 여행 어땠어요?' : '여행에 대한 메모...'}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-[#F0EEE6] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-transparent resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl text-sm font-medium text-gray-500 bg-[#F0EEE6] hover:bg-[#e8e5db] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#FF6B6B] hover:bg-[#e85d5d] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FF6B6B]/20"
            >
              {saving ? '저장 중...' : '여행 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
