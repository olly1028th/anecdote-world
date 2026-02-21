import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { TripStatus, ExpenseCategory, Expense, ChecklistItem } from '../types/trip';
import { createTrip, updateTrip, saveExpenses, saveChecklistItems, useTrip } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import { uploadTripPhoto } from '../lib/storage';
import { expenseCategoryLabel } from '../utils/format';
import PhotoUpload from '../components/PhotoUpload';

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

  // 수정 모드: 기존 데이터로 폼 초기화
  if (isEdit && existing && !initialized) {
    setTitle(existing.title);
    setStatus(existing.status);
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        뒤로
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {isEdit ? '여행 수정' : '새 여행 추가'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 상태 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus('planned')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                status === 'planned'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              계획 중
            </button>
            <button
              type="button"
              onClick={() => setStatus('completed')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                status === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              완료
            </button>
          </div>
        </div>

        {/* 여행 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            여행 제목 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 도쿄 벚꽃 여행"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 날짜 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {status === 'completed' ? '한줄 후기' : '메모'}
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={status === 'completed' ? '이 여행 어땠어요?' : '여행에 대한 메모...'}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* ──────── 경비 입력 ──────── */}
        <div className="bg-gray-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {status === 'completed' ? '경비 내역' : '예상 경비'}
            </h3>
            <button
              type="button"
              onClick={addExpense}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              + 항목 추가
            </button>
          </div>

          {expenses.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              아직 경비 항목이 없습니다. &quot;+ 항목 추가&quot;를 눌러주세요.
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense, i) => (
                <div key={i} className="flex items-start gap-2">
                  {/* 카테고리 선택 */}
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(i, 'category', e.target.value)}
                    className="w-24 shrink-0 px-2 py-2.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {expenseCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>

                  {/* 금액 */}
                  <input
                    type="number"
                    value={expense.amount || ''}
                    onChange={(e) => updateExpense(i, 'amount', Number(e.target.value))}
                    placeholder="금액"
                    min={0}
                    className="w-28 shrink-0 px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* 설명 */}
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => updateExpense(i, 'label', e.target.value)}
                    placeholder="설명 (선택)"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer mt-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">준비 체크리스트</h3>
              <button
                type="button"
                onClick={addChecklistItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                + 항목 추가
              </button>
            </div>

            {checklist.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                아직 체크리스트가 없습니다. &quot;+ 항목 추가&quot;를 눌러주세요.
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
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 text-center no-underline hover:bg-gray-200 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? saveStatus || '저장 중...' : isEdit ? '수정 완료' : '여행 추가'}
          </button>
        </div>
      </form>
    </div>
  );
}
