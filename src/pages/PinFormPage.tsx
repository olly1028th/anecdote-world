import { useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { VisitStatus, PinCategory } from '../types/database';
import { createPin, updatePin, addDemoPin, usePins } from '../hooks/usePins';
import { useTrips } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';

const VISIT_OPTIONS: { value: VisitStatus; label: string; color: string }[] = [
  { value: 'visited', label: '방문', color: 'bg-emerald-600' },
  { value: 'planned', label: '계획', color: 'bg-amber-500' },
  { value: 'wishlist', label: '위시리스트', color: 'bg-indigo-500' },
];

const CATEGORY_OPTIONS: { value: PinCategory; label: string }[] = [
  { value: 'landmark', label: '명소' },
  { value: 'food', label: '맛집' },
  { value: 'cafe', label: '카페' },
  { value: 'hotel', label: '숙소' },
  { value: 'nature', label: '자연' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'activity', label: '활동' },
  { value: 'other', label: '기타' },
];

const markerIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="#3b82f6" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="11" r="3.5" fill="white"/>
    </svg>
  `,
});

/** 지도 클릭으로 위치를 선택하는 컴포넌트 */
function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PinFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { pins } = usePins();
  const { trips } = useTrips();

  const existing = isEdit ? pins.find((p) => p.id === id) : undefined;

  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('planned');
  const [visitedAt, setVisitedAt] = useState('');
  const [category, setCategory] = useState<PinCategory>('landmark');
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [tripId, setTripId] = useState<string | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 수정 모드: 기존 데이터로 폼 초기화
  if (isEdit && existing && !initialized) {
    setName(existing.name);
    setLat(existing.lat);
    setLng(existing.lng);
    setAddress(existing.address);
    setCountry(existing.country);
    setCity(existing.city);
    setVisitStatus(existing.visit_status);
    setVisitedAt(existing.visited_at ?? '');
    setCategory(existing.category);
    setRating(existing.rating);
    setNote(existing.note);
    setTripId(existing.trip_id);
    setDayNumber(existing.day_number);
    setInitialized(true);
  }

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || lat === null || lng === null) return;

    try {
      setSaving(true);
      const input = {
        name: name.trim(),
        lat,
        lng,
        address: address.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        visit_status: visitStatus,
        visited_at: visitStatus === 'visited' && visitedAt ? visitedAt : null,
        category,
        rating: visitStatus === 'visited' ? rating : null,
        note: note.trim() || undefined,
        trip_id: tripId || null,
        day_number: dayNumber,
      };

      if (!isSupabaseConfigured) {
        // 데모 모드: 로컬 상태에 추가
        const now = new Date().toISOString();
        addDemoPin({
          id: `demo-pin-${Date.now()}`,
          user_id: 'demo-user-001',
          name: input.name,
          lat: input.lat,
          lng: input.lng,
          address: input.address ?? '',
          country: input.country ?? '',
          city: input.city ?? '',
          visit_status: input.visit_status,
          visited_at: input.visited_at ?? null,
          category: input.category ?? 'other',
          rating: input.rating ?? null,
          note: input.note ?? '',
          trip_id: input.trip_id ?? null,
          day_number: input.day_number ?? null,
          sort_order: 0,
          created_at: now,
          updated_at: now,
        });
        window.dispatchEvent(new CustomEvent('pin-added'));
      } else if (isEdit && id) {
        await updatePin(id, input);
      } else {
        await createPin(input);
      }
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const mapCenter: [number, number] = lat !== null && lng !== null
    ? [lat, lng]
    : [36.5, 127.5]; // 한국 중심 기본값

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
        {isEdit ? '핀 수정' : '새 핀 추가'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 지도 위치 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            위치 선택 <span className="text-red-400">*</span>
            <span className="text-xs text-gray-400 ml-2">지도를 클릭하세요</span>
          </label>
          <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer
              center={mapCenter}
              zoom={lat !== null ? 13 : 5}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker onSelect={handleMapClick} />
              {lat !== null && lng !== null && (
                <Marker position={[lat, lng]} icon={markerIcon} />
              )}
            </MapContainer>
          </div>
          {lat !== null && lng !== null && (
            <p className="text-xs text-gray-400 mt-1">
              위도: {lat.toFixed(4)}, 경도: {lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* 방문 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
          <div className="flex gap-3">
            {VISIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisitStatus(opt.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  visitStatus === opt.value
                    ? `${opt.color} text-white`
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 핀 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            장소 이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 센소지, 에펠탑"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 주소 / 국가 / 도시 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="상세 주소"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">국가</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="예: 일본"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">도시</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예: 도쿄"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  category === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 여행 연결 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">연결된 여행</label>
            <select
              value={tripId ?? ''}
              onChange={(e) => setTripId(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">없음</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
            <input
              type="number"
              min={1}
              value={dayNumber ?? ''}
              onChange={(e) => setDayNumber(e.target.value ? Number(e.target.value) : null)}
              placeholder="예: 1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 방문 날짜 (방문 상태일 때만) */}
        {visitStatus === 'visited' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">방문 날짜</label>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* 별점 (방문 상태일 때만) */}
        {visitStatus === 'visited' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="text-2xl cursor-pointer transition-colors"
                  style={{ color: rating !== null && star <= rating ? '#f59e0b' : '#d1d5db' }}
                >
                  ★
                </button>
              ))}
              {rating !== null && (
                <span className="text-sm text-gray-400 ml-2 self-center">{rating}/5</span>
              )}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 장소에 대한 메모..."
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
            disabled={saving || !name.trim() || lat === null || lng === null}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '핀 추가'}
          </button>
        </div>
      </form>
    </div>
  );
}
