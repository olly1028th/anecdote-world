import { useState, useCallback, lazy, Suspense } from 'react';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import type { DestinationInfo } from '../types/destination';
import { EMPTY_DESTINATION } from '../types/destination';

const PlaceSearchModal = lazy(() => import('./PlaceSearchModal'));

interface Props {
  value: DestinationInfo;
  onChange: (info: DestinationInfo) => void;
}

export default function DestinationPicker({ value, onChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSelect = useCallback(
    async (lat: number, lng: number, name?: string) => {
      // 역지오코딩으로 도시/국가 정보 가져오기
      let country = '';
      let city = '';
      let finalName = name || '';
      try {
        const res = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
        );
        const data = await res.json();
        const addr = data.address ?? {};
        city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
        country = addr.country || '';
        if (!finalName) {
          finalName = [city, country].filter(Boolean).join(', ');
        }
      } catch {
        if (!finalName) {
          finalName = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        }
      }
      onChange({ name: finalName, lat, lng, country, city });
      setSearchOpen(false);
    },
    [onChange],
  );

  const hasDestination = value.lat != null && value.lng != null;

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 dark:text-slate-400 mb-2">
        Destination
      </label>

      {hasDestination ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#f48c25] text-white px-3 py-1.5 rounded-full border-2 border-slate-900 dark:border-[#4a3f35] shadow-[2px_2px_0px_0px_#1c140d] dark:shadow-[2px_2px_0px_0px_rgba(74,63,53,0.5)]">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {value.name || `${value.lat!.toFixed(4)}, ${value.lng!.toFixed(4)}`}
          </span>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="text-[10px] font-bold text-[#0d9488] hover:text-[#0d9488]/80 transition-colors cursor-pointer uppercase tracking-wider bg-transparent border-0 p-0"
          >
            변경
          </button>
          <button
            type="button"
            onClick={() => onChange(EMPTY_DESTINATION)}
            className="text-[10px] font-bold text-[#1c140d]/40 dark:text-slate-500 hover:text-[#f43f5e] transition-colors cursor-pointer uppercase tracking-wider bg-transparent border-0 p-0"
          >
            삭제
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-400 dark:border-[#4a3f35] text-sm font-bold text-slate-400 dark:text-slate-500 hover:border-[#f48c25] hover:text-[#f48c25] transition-colors cursor-pointer bg-transparent"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          지도에서 목적지 검색
        </button>
      )}

      {searchOpen && (
        <Suspense fallback={null}>
          <PlaceSearchModal
            initialQuery={value.name || ''}
            onSelect={handleSelect}
            onClose={() => setSearchOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
