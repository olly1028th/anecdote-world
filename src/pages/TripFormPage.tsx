import { useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { TripStatus, ExpenseCategory, Expense, ChecklistItem } from '../types/trip';
import { createTrip, updateTrip, saveExpenses, saveChecklistItems, useTrip } from '../hooks/useTrips';
import { createPin } from '../hooks/usePins';
import { isSupabaseConfigured } from '../lib/supabase';
import { uploadTripPhoto } from '../lib/storage';
import { expenseCategoryLabel } from '../utils/format';
import PhotoUpload from '../components/PhotoUpload';
import DestinationPicker, { EMPTY_DESTINATION, type DestinationInfo } from '../components/DestinationPicker';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'flight', 'hotel', 'food', 'transport', 'activity', 'shopping', 'other',
];

function emptyExpense(): Expense {
  return { category: 'other', amount: 0, label: '' };
}

function emptyChecklistItem(): ChecklistItem {
  return { text: '', checked: false };
}

export default function TripFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { trip: existing } = useTrip(isEdit ? id : undefined);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TripStatus>('planned');
  const [destination, setDestination] = useState<DestinationInfo>(EMPTY_DESTINATION);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [initialized, setInitialized] = useState(false);

  const handleDestinationChange = useCallback((info: DestinationInfo) => {
    setDestination(info);
  }, []);

  // 수정 모드: 기존 데이터로 폼 초기화
  if (isEdit && existing && !initialized) {
    setTitle(existing.title);
    setStatus(existing.status);
    if (existing.destination) {
      setDestination({ ...EMPTY_DESTINATION, name: existing.destination });
    }
    setStartDate(existing.startDate);
    setEndDate(existing.endDate);
    setCoverImage(existing.coverImage);
    setPhotos(existing.photos);
    setMemo(existing.memo);
    setExpenses(existing.expenses.length > 0 ? existing.expenses : []);
    setChecklist(existing.checklist.length > 0 ? existing.checklist : []);
    setInitialized(true);
  }

  // ---- 경비 핸들러 ----
  const addExpense = () => setExpenses([...expenses, emptyExpense()]);
  const removeExpense = (index: number) =>
    setExpenses(expenses.filter((_, i) => i !== index));
  const updateExpense = (index: number, field: keyof Expense, value: string | number) => {
    setExpenses(expenses.map((e, i) =>
      i === index ? { ...e, [field]: value } : e,
    ));
  };

  // ---- 체크리스트 핸들러 ----
  const addChecklistItem = () => setChecklist([...checklist, emptyChecklistItem()]);
  const removeChecklistItem = (index: number) =>
    setChecklist(checklist.filter((_, i) => i !== index));
  const updateChecklistText = (index: number, text: string) => {
    setChecklist(checklist.map((c, i) =>
      i === index ? { ...c, text } : c,
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isSupabaseConfigured) {
      alert('데모 모드에서는 저장할 수 없습니다. Supabase를 연결해주세요.');
      return;
    }

    try {
      setSaving(true);
      setSaveStatus('여행 저장 중...');
      const input = {
        title: title.trim(),
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        cover_image: coverImage.trim() || undefined,
        memo: memo.trim() || undefined,
      };

      let tripId: string;
      if (isEdit && id) {
        await updateTrip(id, input);
        tripId = id;
      } else {
        tripId = await createTrip(input);
      }

      // 여행지 좌표가 있으면 핀 생성 (신규 생성 시에만)
      if (!isEdit && destination.lat != null && destination.lng != null) {
        try {
          setSaveStatus('여행지 핀 저장 중...');
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

      // 사진 업로드 (base64 → Storage, 외부 URL은 그대로)
      const base64Photos = photos.filter((p) => p.startsWith('data:'));
      if (base64Photos.length > 0) {
        setSaveStatus(`사진 업로드 중... (0/${base64Photos.length})`);
      }
      const uploadedUrls: string[] = [];
      let uploadCount = 0;
      for (const photo of photos) {
        if (photo.startsWith('data:')) {
          try {
            const url = await uploadTripPhoto(tripId, photo);
            uploadedUrls.push(url);
            uploadCount++;
            setSaveStatus(`사진 업로드 중... (${uploadCount}/${base64Photos.length})`);
          } catch {
            console.warn('사진 업로드 건너뜀');
          }
        } else {
          uploadedUrls.push(photo);
        }
      }

      // 첫 번째 사진을 대표 이미지로 설정
      const finalCover = coverImage.startsWith('data:')
        ? uploadedUrls[0] || ''
        : coverImage;
      if (finalCover && finalCover !== input.cover_image) {
        await updateTrip(tripId, { cover_image: finalCover });
      }

      // 경비 저장 (빈 항목 제외)
      setSaveStatus('경비 저장 중...');
      const validExpenses = expenses.filter((e) => e.amount > 0);
      await saveExpenses(tripId, validExpenses);

      // 체크리스트 저장 (빈 항목 제외)
      setSaveStatus('체크리스트 저장 중...');
      const validChecklist = checklist.filter((c) => c.text.trim());
      await saveChecklistItems(tripId, validChecklist);

      navigate(`/trip/${tripId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 space-y-6 max-w-2xl mx-auto">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#2D3436]/40 hover:text-[#FF6B6B] transition-colors no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-[#2D3436]">
          {isEdit ? 'Edit Planet' : 'New Planet'}
        </h1>
        <div className="h-[4px] flex-1 bg-[#2D3436] rounded-full" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* 사진 업로드 */}
        <PhotoUpload
          photos={photos}
          onChange={setPhotos}
          coverImage={coverImage}
          onCoverChange={setCoverImage}
        />

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

        {/* ──────── 경비 입력 ──────── */}
        <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-[#FFD166]/10 shadow-[4px_4px_0px_0px_#2D3436]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3436]">
              {status === 'completed' ? 'Expenses' : 'Est. Expenses'}
            </h3>
            <button
              type="button"
              onClick={addExpense}
              className="text-[10px] font-black uppercase tracking-widest text-[#FF6B6B] hover:text-[#e85d5d] cursor-pointer border-2 border-[#FF6B6B] px-3 py-1 rounded-full hover:bg-[#FF6B6B]/10 transition-colors"
            >
              + Add
            </button>
          </div>

          {expenses.length === 0 ? (
            <p className="text-xs text-[#2D3436]/40 text-center py-4 font-medium">
              아직 경비 항목이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense, i) => (
                <div key={i} className="flex items-start gap-2">
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(i, 'category', e.target.value)}
                    className="w-24 shrink-0 px-2 py-2.5 rounded-lg border-2 border-[#2D3436] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {expenseCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={expense.amount || ''}
                    onChange={(e) => updateExpense(i, 'amount', Number(e.target.value))}
                    placeholder="금액"
                    min={0}
                    className="w-28 shrink-0 px-3 py-2.5 rounded-lg border-2 border-[#2D3436] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40"
                  />
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => updateExpense(i, 'label', e.target.value)}
                    placeholder="설명"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-[#2D3436] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-[#2D3436]/30 hover:text-[#FF6B6B] transition-colors cursor-pointer mt-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ──────── 체크리스트 입력 (계획 여행용) ──────── */}
        {status === 'planned' && (
          <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-[#4ECDC4]/10 shadow-[4px_4px_0px_0px_#2D3436]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#2D3436]">Checklist</h3>
              <button
                type="button"
                onClick={addChecklistItem}
                className="text-[10px] font-black uppercase tracking-widest text-[#FF6B6B] hover:text-[#e85d5d] cursor-pointer border-2 border-[#FF6B6B] px-3 py-1 rounded-full hover:bg-[#FF6B6B]/10 transition-colors"
              >
                + Add
              </button>
            </div>

            {checklist.length === 0 ? (
              <p className="text-xs text-[#2D3436]/40 text-center py-4 font-medium">
                아직 체크리스트가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateChecklistText(i, e.target.value)}
                      placeholder="예: 항공편 예약"
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-[#2D3436] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-[#2D3436]/30 hover:text-[#FF6B6B] transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex gap-3 pt-4">
          <Link
            to="/"
            className="flex-1 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight text-[#2D3436]/60 bg-white border-2 border-[#2D3436] text-center no-underline hover:bg-gray-50 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight text-white bg-[#FF6B6B] border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_#2D3436] hover:bg-[#e85d5d] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? saveStatus || 'Saving...' : isEdit ? 'Update' : 'Launch Planet'}
          </button>
        </div>
      </form>
    </div>
  );
}
