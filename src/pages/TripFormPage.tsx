import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { TripStatus } from '../types/trip';
import { createTrip, updateTrip, useTrip } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import PhotoUpload from '../components/PhotoUpload';

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
  const [saving, setSaving] = useState(false);
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
    setInitialized(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isSupabaseConfigured) {
      alert('데모 모드에서는 저장할 수 없습니다. Supabase를 연결해주세요.');
      return;
    }

    try {
      setSaving(true);
      const input = {
        title: title.trim(),
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        cover_image: coverImage.trim() || undefined,
        memo: memo.trim() || undefined,
      };

      if (isEdit && id) {
        await updateTrip(id, input);
        navigate(`/trip/${id}`);
      } else {
        const newId = await createTrip(input);
        navigate(`/trip/${newId}`);
      }
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
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '여행 추가'}
          </button>
        </div>
      </form>
    </div>
  );
}
