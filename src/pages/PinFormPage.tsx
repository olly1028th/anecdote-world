import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { VisitStatus, PinCategory } from '../types/database';
import { createPin, updatePin, addDemoPin, usePins } from '../hooks/usePins';
import { useTrips } from '../hooks/useTrips';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import 'leaflet/dist/leaflet.css';

const VISIT_OPTIONS: { value: VisitStatus; label: string; color: string }[] = [
  { value: 'visited', label: '방문', color: 'bg-[#0d9488] text-white retro-shadow' },
  { value: 'planned', label: '계획', color: 'bg-[#eab308] text-slate-900 retro-shadow' },
  { value: 'wishlist', label: '위시리스트', color: 'bg-[#6366f1] text-white retro-shadow' },
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
      <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="#f48c25" stroke="#1e293b" stroke-width="1.5"/>
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
  const { toast } = useToast();
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
  useEffect(() => {
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
  }, [isEdit, existing, initialized]);

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

      const saveDemoPin = () => {
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
      };

      let supabaseSaved = false;
      if (!isSupabaseConfigured) {
        saveDemoPin();
      } else if (isEdit && id) {
        try {
          await updatePin(id, input);
          window.dispatchEvent(new CustomEvent('pin-added'));
          supabaseSaved = true;
        } catch (err) {
          console.error('[PinFormPage] 핀 수정 Supabase 실패:', err);
          saveDemoPin();
        }
      } else {
        try {
          await createPin(input);
          window.dispatchEvent(new CustomEvent('pin-added'));
          supabaseSaved = true;
        } catch (err) {
          console.error('[PinFormPage] 핀 생성 Supabase 실패:', err);
          saveDemoPin();
        }
      }
      navigate('/');
      if (isSupabaseConfigured && !supabaseSaved) {
        toast('서버 저장 실패 — 로컬에 임시 저장되었습니다', 'error');
      } else {
        toast(isEdit ? '핀이 수정되었습니다' : '핀이 저장되었습니다');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const mapCenter: [number, number] = lat !== null && lng !== null
    ? [lat, lng]
    : [36.5, 127.5]; // 한국 중심 기본값

  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-sm font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2";

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
        <p className="text-sm font-bold text-[#f48c25] uppercase tracking-widest mb-1">Pin Setup</p>
        <h1 className="text-2xl font-bold text-[#1c140d] dark:text-slate-100">
          {isEdit ? 'Edit Pin' : 'New Pin'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 지도 위치 선택 */}
        <div>
          <label className={labelClass}>
            Location <span className="text-[#f43f5e]">*</span>
            <span className="text-[10px] text-slate-400 ml-2 normal-case tracking-normal">지도를 클릭하세요</span>
          </label>
          <div className="h-[220px] sm:h-[300px] rounded-xl overflow-hidden border-[3px] border-slate-900 dark:border-slate-100 retro-shadow">
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
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              위도: {lat.toFixed(4)}, 경도: {lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* 방문 상태 */}
        <div>
          <label className={labelClass}>Status</label>
          <div className="flex gap-3">
            {VISIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisitStatus(opt.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 ${
                  visitStatus === opt.value
                    ? opt.color
                    : 'bg-white dark:bg-[#2a1f15] text-slate-400 shadow-none'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 핀 이름 */}
        <div>
          <label className={labelClass}>
            Name <span className="text-[#f43f5e]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 센소지, 에펠탑"
            required
            className={inputClass}
          />
        </div>

        {/* 주소 / 국가 / 도시 */}
        <div>
          <label className={labelClass}>Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="상세 주소"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="예: 일본"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예: 도쿄"
              className={inputClass}
            />
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <label className={labelClass}>Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer border-2 border-slate-900 ${
                  category === opt.value
                    ? 'bg-[#f48c25] text-white retro-shadow'
                    : 'bg-white dark:bg-[#2a1f15] text-slate-500 dark:text-slate-400 shadow-none'
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
            <label className={labelClass}>Trip</label>
            <select
              value={tripId ?? ''}
              onChange={(e) => setTripId(e.target.value || null)}
              className={inputClass}
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
            <label className={labelClass}>Day</label>
            <input
              type="number"
              min={1}
              value={dayNumber ?? ''}
              onChange={(e) => setDayNumber(e.target.value ? Number(e.target.value) : null)}
              placeholder="예: 1"
              className={inputClass}
            />
          </div>
        </div>

        {/* 방문 날짜 (방문 상태일 때만) */}
        {visitStatus === 'visited' && (
          <div>
            <label className={labelClass}>Visit Date</label>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* 별점 (방문 상태일 때만) */}
        {visitStatus === 'visited' && (
          <div>
            <label className={labelClass}>Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="text-2xl cursor-pointer transition-colors bg-transparent border-0 p-0"
                  style={{ color: rating !== null && star <= rating ? '#f48c25' : '#d1d5db' }}
                >
                  ★
                </button>
              ))}
              {rating !== null && (
                <span className="text-sm text-slate-400 ml-2 self-center font-bold">{rating}/5</span>
              )}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className={labelClass}>Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 장소에 대한 메모..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-3 pt-4">
          <Link
            to="/"
            className="flex-1 py-3.5 rounded-xl text-sm font-bold uppercase tracking-tight text-slate-500 bg-white dark:bg-[#2a1f15] border-2 border-slate-900 text-center no-underline hover:bg-gray-50 dark:hover:bg-[#1a1208] transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !name.trim() || lat === null || lng === null}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#d97a1e] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Pin' : 'Add Pin'}
          </button>
        </div>
      </form>
    </div>
  );
}
