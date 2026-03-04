import { useState } from 'react';
import { savePlaces, updateDemoTrip } from '../hooks/useTrips';
import { replaceLocalPinsForTrip } from '../lib/localStore';
import { useAuth, DEMO_USER_ID } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { tripStatusToPinStatus } from '../utils/statusConvert';
import { SaveCancelButtons } from './InlineEditButtons';
import PlaceSearchModal from './PlaceSearchModal';
import type { Place } from '../types/trip';
import type { Trip } from '../types/trip';

interface Props {
  trip: Trip;
  tripId: string;
  isDemo: boolean;
  onDone: () => void;
  refetch: () => void;
}

export default function InlinePlacesEditor({ trip, tripId, isDemo, onDone, refetch }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchingPlaceIdx, setSearchingPlaceIdx] = useState<number | null>(null);

  const [draftPlaces, setDraftPlaces] = useState<Place[]>(() => {
    if (trip.places.length > 0) {
      return trip.places.map((p) => ({
        ...p,
        day: p.day && p.day > 0 ? p.day : 1,
      }));
    }
    return [{ name: '', priority: 'want', note: '', day: 1 }];
  });

  const getTripDays = (): number => {
    const s = new Date(trip.startDate).getTime();
    const e = new Date(trip.endDate).getTime();
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  };

  const formatDayDate = (day: number): string => {
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + day - 1);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}.${d.getDate()} (${weekdays[d.getDay()]})`;
  };

  const addDraftPlace = (day: number) => setDraftPlaces((prev) => [...prev, { name: '', priority: 'want', note: '', day, time: '' }]);
  const removeDraftPlace = (i: number) => setDraftPlaces((prev) => prev.filter((_, idx) => idx !== i));
  const updateDraftPlace = (i: number, field: keyof Place, value: string | number) => {
    setDraftPlaces((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const handlePlaceSearchSelect = (lat: number, lng: number, name?: string) => {
    if (searchingPlaceIdx == null) return;
    setDraftPlaces((prev) => prev.map((p, i) => i === searchingPlaceIdx ? { ...p, lat, lng, ...(name ? { name } : {}) } : p));
    setSearchingPlaceIdx(null);
    toast('장소 정보가 등록되었습니다');
  };

  const clearPlaceLocation = (idx: number) => {
    setDraftPlaces((prev) => prev.map((p, i) => i === idx ? { ...p, lat: undefined, lng: undefined } : p));
  };

  const handleSave = async () => {
    const valid = draftPlaces.filter((p) => p.name.trim() && p.day && p.day > 0);

    const buildLocalPins = () => {
      const now = new Date().toISOString();
      const pinStatus = tripStatusToPinStatus(trip.status);
      return valid.map((p, i) => ({
        id: `pin-local-${tripId}-${i}-${Date.now()}`,
        user_id: user?.id ?? DEMO_USER_ID,
        trip_id: tripId,
        name: p.name,
        address: p.priority,
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
        country: '',
        city: '',
        visit_status: p.priority === 'maybe' ? 'wishlist' as const : pinStatus,
        visited_at: trip.status === 'completed' ? (trip.startDate || null) : null,
        category: 'other' as const,
        rating: null,
        note: p.time ? `[${p.time}] ${p.note || ''}` : (p.note || ''),
        day_number: p.day ?? null,
        sort_order: i,
        created_at: now,
        updated_at: now,
      }));
    };

    try {
      setSaving(true);
      let plOk = true;
      if (isDemo) {
        updateDemoTrip(tripId, { places: valid });
        replaceLocalPinsForTrip(tripId, buildLocalPins());
      } else {
        try {
          await savePlaces(tripId, valid);
        } catch (err) {
          plOk = false;
          console.error('[savePlaces] Supabase 실패, 로컬 저장 fallback:', err);
          updateDemoTrip(tripId, { places: valid });
          replaceLocalPinsForTrip(tripId, buildLocalPins());
        }
      }
      onDone();
      refetch();
      window.dispatchEvent(new CustomEvent('pin-added'));
      toast(plOk ? '일정이 저장되었습니다' : '서버 저장 실패 — 로컬에 임시 저장되었습니다', plOk ? 'success' : 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Daily Schedule</h3>
        <div className="space-y-5">
          {Array.from({ length: getTripDays() }, (_, di) => di + 1).map((day) => {
            const dayPlaces = draftPlaces
              .map((p, idx) => ({ ...p, _idx: idx }))
              .filter((p) => p.day === day);
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f48c25] border-2 border-slate-900 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">D{day}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Day {day}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{formatDayDate(day)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addDraftPlace(day)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-2.5 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
                  >
                    + Add
                  </button>
                </div>
                {dayPlaces.length === 0 ? (
                  <p className="text-[10px] text-slate-300 font-medium text-center py-3 ml-10 border-l-2 border-[#f48c25]/20">일정 없음</p>
                ) : (
                  <div className="space-y-2 ml-3 pl-3 border-l-2 border-[#f48c25]/30">
                    {dayPlaces.map((place) => (
                      <div key={place._idx} className="bg-[#F9F4E8] dark:bg-slate-700 p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 space-y-1.5">
                        {/* 1행: 일정명 + 삭제 */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f48c25] shrink-0" />
                          <input
                            type="text"
                            value={place.name}
                            onChange={(e) => updateDraftPlace(place._idx, 'name', e.target.value)}
                            placeholder="일정명"
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border-2 border-slate-300 text-xs font-medium bg-white dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
                          />
                          <button
                            type="button"
                            onClick={() => removeDraftPlace(place._idx)}
                            className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {/* 2행: 비고 + 장소 정보 (선택) */}
                        <div className="flex items-center gap-1.5 ml-3.5">
                          <input
                            type="text"
                            value={place.note || ''}
                            onChange={(e) => updateDraftPlace(place._idx, 'note', e.target.value)}
                            placeholder="비고 (선택)"
                            className="flex-1 min-w-0 px-2.5 py-1 rounded-lg border-2 border-slate-200 text-[10px] font-medium bg-white dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
                          />
                          {place.lat != null && place.lng != null ? (
                            <button
                              type="button"
                              onClick={() => clearPlaceLocation(place._idx)}
                              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-[#0d9488] bg-[#0d9488]/10 text-[10px] font-bold text-[#0d9488] hover:bg-[#0d9488]/20 transition-colors cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              등록됨
                              <svg className="w-2.5 h-2.5 text-[#0d9488]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSearchingPlaceIdx(place._idx)}
                              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-slate-300 text-[10px] font-bold text-slate-400 hover:border-[#f48c25] hover:text-[#f48c25] transition-colors cursor-pointer bg-transparent"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              장소검색
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <SaveCancelButtons onSave={handleSave} onCancel={onDone} saving={saving} />
      </div>

      {searchingPlaceIdx != null && (
        <PlaceSearchModal
          initialQuery={draftPlaces[searchingPlaceIdx]?.name?.trim() || ''}
          onSelect={handlePlaceSearchSelect}
          onClose={() => setSearchingPlaceIdx(null)}
        />
      )}
    </>
  );
}
