import { useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { TripStatus, ExpenseCategory, Expense, ChecklistItem } from '../types/trip';
import { createTrip, updateTrip, saveExpenses, saveChecklistItems, useTrip, addDemoTrip, updateDemoTrip } from '../hooks/useTrips';
import { createPin, addDemoPin } from '../hooks/usePins';
import { isSupabaseConfigured } from '../lib/supabase';
import { uploadTripPhoto } from '../lib/storage';
import { useToast } from '../contexts/ToastContext';
import { expenseCategoryLabel } from '../utils/format';
import PhotoUpload from '../components/PhotoUpload';
import DestinationPicker from '../components/DestinationPicker';
import { EMPTY_DESTINATION } from '../types/destination';
import type { DestinationInfo } from '../types/destination';

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
  const { toast } = useToast();
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 유효성 검증
  const errors: Record<string, string> = {};
  if (touched.title && !title.trim()) errors.title = '여행 제목을 입력해주세요';
  if (touched.endDate && startDate && endDate && endDate < startDate) errors.endDate = '종료일이 시작일보다 빠릅니다';
  const hasErrors = Object.keys(errors).length > 0;

  const handleDestinationChange = useCallback((info: DestinationInfo) => {
    setDestination(info);
  }, []);

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

  const addExpense = () => setExpenses([...expenses, emptyExpense()]);
  const removeExpense = (index: number) => setExpenses(expenses.filter((_, i) => i !== index));
  const updateExpense = (index: number, field: keyof Expense, value: string | number) => {
    setExpenses(expenses.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const addChecklistItem = () => setChecklist([...checklist, emptyChecklistItem()]);
  const removeChecklistItem = (index: number) => setChecklist(checklist.filter((_, i) => i !== index));
  const updateChecklistText = (index: number, text: string) => {
    setChecklist(checklist.map((c, i) => (i === index ? { ...c, text } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);

      // 여행지 이름만 입력하고 좌표가 없으면 자동 지오코딩 (Photon 우선, Nominatim fallback)
      let finalDest = destination;
      if (finalDest.name.trim() && finalDest.lat == null) {
        try {
          setSaveStatus('여행지 검색 중...');
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(finalDest.name.trim())}&lang=ko&limit=1`,
          );
          const photonData = await photonRes.json();
          if (photonData.features?.length > 0) {
            const f = photonData.features[0];
            const p = f.properties;
            const city = p.city || p.town || p.village || p.county || p.state || '';
            const country = p.country || '';
            const name = [p.name || city, country].filter(Boolean).join(', ') || finalDest.name;
            finalDest = { name, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], country, city };
          } else {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalDest.name.trim())}&format=json&accept-language=ko&limit=1&addressdetails=1`,
            );
            const geoResults = await geoRes.json();
            if (geoResults.length > 0) {
              const r = geoResults[0];
              const addr = r.address ?? {};
              const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
              const country = addr.country || '';
              const name = [city, country].filter(Boolean).join(', ') || finalDest.name;
              finalDest = { name, lat: parseFloat(r.lat), lng: parseFloat(r.lon), country, city };
            }
          }
        } catch { /* 지오코딩 실패해도 진행 */ }
      }

      // 데모 모드: localStorage에 저장
      if (!isSupabaseConfigured) {
        const now = new Date().toISOString();
        const validExpenses = expenses.filter((e) => e.amount > 0);
        const validChecklist = checklist.filter((c) => c.text.trim());

        if (isEdit && id) {
          updateDemoTrip(id, {
            title: title.trim(),
            status,
            destination: finalDest.name,
            startDate: startDate || '',
            endDate: endDate || '',
            coverImage: coverImage.trim(),
            memo: memo.trim(),
            photos,
            expenses: validExpenses,
            checklist: validChecklist,
          });
          window.dispatchEvent(new CustomEvent('trip-added'));
          navigate(`/trip/${id}`);
        } else {
          const tripId = `demo-${Date.now()}`;
          addDemoTrip({
            id: tripId,
            title: title.trim(),
            destination: finalDest.name,
            status,
            startDate: startDate || '',
            endDate: endDate || '',
            coverImage: coverImage.trim(),
            memo: memo.trim(),
            expenses: validExpenses,
            itinerary: [],
            photos,
            places: [],
            checklist: validChecklist,
            createdAt: now,
            updatedAt: now,
          });
          // 좌표가 있으면 핀도 생성
          if (finalDest.lat != null && finalDest.lng != null) {
            addDemoPin({
              id: `pin-demo-${Date.now()}`,
              user_id: 'demo-user-001',
              trip_id: tripId,
              name: finalDest.name || finalDest.city || '여행지',
              address: '',
              lat: finalDest.lat,
              lng: finalDest.lng,
              country: finalDest.country,
              city: finalDest.city,
              visit_status: status === 'completed' ? 'visited' : status === 'wishlist' ? 'wishlist' : 'planned',
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
          window.dispatchEvent(new CustomEvent('trip-added'));
          navigate(`/trip/${tripId}`);
        }
        return;
      }

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

      if (!isEdit && finalDest.lat != null && finalDest.lng != null) {
        try {
          setSaveStatus('여행지 핀 저장 중...');
          await createPin({
            name: finalDest.name || finalDest.city || '여행지',
            lat: finalDest.lat,
            lng: finalDest.lng,
            country: finalDest.country,
            city: finalDest.city,
            visit_status: status === 'completed' ? 'visited' : status === 'wishlist' ? 'wishlist' : 'planned',
            visited_at: status === 'completed' ? (startDate || undefined) : undefined,
            category: 'landmark',
            trip_id: tripId,
          });
          window.dispatchEvent(new CustomEvent('pin-added'));
        } catch { /* 핀 생성 실패해도 여행은 저장됨 */ }
      }

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
          } catch { console.warn('사진 업로드 건너뜀'); }
        } else {
          uploadedUrls.push(photo);
        }
      }

      const finalCover = coverImage.startsWith('data:') ? uploadedUrls[0] || '' : coverImage;
      if (finalCover && finalCover !== input.cover_image) {
        await updateTrip(tripId, { cover_image: finalCover });
      }

      setSaveStatus('경비 저장 중...');
      const validExpenses = expenses.filter((e) => e.amount > 0);
      await saveExpenses(tripId, validExpenses);

      setSaveStatus('체크리스트 저장 중...');
      const validChecklist = checklist.filter((c) => c.text.trim());
      await saveChecklistItems(tripId, validChecklist);

      navigate(`/trip/${tripId}`);
      toast(isEdit ? '여행이 수정되었습니다' : '여행이 저장되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 space-y-6 max-w-2xl mx-auto pb-24">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#f48c25] transition-colors no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div>
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Mission Setup</p>
        <h1 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
          {isEdit ? 'Edit Mission' : 'New Mission'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 상태 선택 */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Status</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus('planned')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 ${
                status === 'planned'
                  ? 'bg-[#eab308] text-slate-900 retro-shadow'
                  : 'bg-white text-slate-400 shadow-none'
              }`}
            >
              계획 중
            </button>
            <button
              type="button"
              onClick={() => setStatus('completed')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 ${
                status === 'completed'
                  ? 'bg-[#0d9488] text-white retro-shadow'
                  : 'bg-white text-slate-400 shadow-none'
              }`}
            >
              완료
            </button>
            <button
              type="button"
              onClick={() => setStatus('wishlist')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 ${
                status === 'wishlist'
                  ? 'bg-[#6366f1] text-white retro-shadow'
                  : 'bg-white text-slate-400 shadow-none'
              }`}
            >
              위시
            </button>
          </div>
        </div>

        {/* 여행 제목 */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Title <span className="text-[#f43f5e]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, title: true }))}
            placeholder="예: 도쿄 벚꽃 여행"
            required
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 ${
              errors.title ? 'border-[#f43f5e] focus:border-[#f43f5e] focus:ring-[#f43f5e]/40' : 'border-slate-900 focus:border-[#f48c25]'
            }`}
          />
          {errors.title && (
            <p className="text-[10px] font-bold text-[#f43f5e] mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.title}
            </p>
          )}
        </div>

        {/* 여행지 선택 */}
        <DestinationPicker value={destination} onChange={handleDestinationChange} />

        {/* 날짜 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, endDate: true }))}
              className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 ${
                errors.endDate ? 'border-[#f43f5e] focus:border-[#f43f5e] focus:ring-[#f43f5e]/40' : 'border-slate-900 focus:border-[#f48c25]'
              }`}
            />
            {errors.endDate && (
              <p className="text-[10px] font-bold text-[#f43f5e] mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* 사진 업로드 */}
        <PhotoUpload photos={photos} onChange={setPhotos} coverImage={coverImage} onCoverChange={setCoverImage} />

        {/* 메모 */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            {status === 'completed' ? 'Review' : 'Memo'}
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={status === 'completed' ? '이 여행 어땠어요?' : '여행에 대한 메모...'}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] resize-none"
          />
        </div>

        {/* 경비 입력 */}
        <div className="bg-white dark:bg-slate-800 border-[3px] border-slate-900 rounded-xl p-5 retro-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
              {status === 'completed' ? 'Expenses' : 'Est. Expenses'}
            </h3>
            <button
              type="button"
              onClick={addExpense}
              className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors"
            >
              + Add
            </button>
          </div>

          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 경비 항목이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense, i) => (
                <div key={i} className="flex items-start gap-2">
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(i, 'category', e.target.value)}
                    className="w-24 shrink-0 px-2 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{expenseCategoryLabel(cat)}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={expense.amount || ''}
                    onChange={(e) => updateExpense(i, 'amount', Number(e.target.value))}
                    placeholder="금액"
                    min={0}
                    className="w-28 shrink-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                  />
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => updateExpense(i, 'label', e.target.value)}
                    placeholder="설명"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
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
        </div>

        {/* 체크리스트 입력 */}
        {(status === 'planned' || status === 'wishlist') && (
          <div className="bg-white dark:bg-slate-800 border-[3px] border-slate-900 rounded-xl p-5 retro-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Checklist</h3>
              <button
                type="button"
                onClick={addChecklistItem}
                className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors"
              >
                + Add
              </button>
            </div>

            {checklist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">아직 체크리스트가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateChecklistText(i, e.target.value)}
                      placeholder="예: 항공편 예약"
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-slate-900 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(i)}
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
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex gap-3 pt-4">
          <Link
            to="/"
            className="flex-1 py-3.5 rounded-xl text-sm font-bold uppercase tracking-tight text-slate-500 bg-white border-2 border-slate-900 text-center no-underline hover:bg-gray-50 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !title.trim() || hasErrors}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#d97a1e] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? saveStatus || 'Saving...' : isEdit ? 'Update' : 'Launch Mission'}
          </button>
        </div>
      </form>
    </div>
  );
}
