import { useState, useCallback, lazy, Suspense } from 'react';

const DestinationMap = lazy(() => import('./DestinationMap'));

export interface DestinationInfo {
  name: string;
  lat: number | null;
  lng: number | null;
  country: string;
  city: string;
}

export const EMPTY_DESTINATION: DestinationInfo = {
  name: '',
  lat: null,
  lng: null,
  country: '',
  city: '',
};

interface Props {
  value: DestinationInfo;
  onChange: (info: DestinationInfo) => void;
}

export default function DestinationPicker({ value, onChange }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleMapSelect = useCallback(
    async (lat: number, lng: number) => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
        );
        const data = await res.json();
        const addr = data.address ?? {};
        const city =
          addr.city || addr.town || addr.village || addr.county || addr.state || '';
        const country = addr.country || '';
        const name = [city, country].filter(Boolean).join(', ');
        onChange({ name, lat, lng, country, city });
      } catch {
        // Reverse geocoding failed — use raw coordinates
        onChange({
          name: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
          lat,
          lng,
          country: '',
          city: '',
        });
      } finally {
        setGeocoding(false);
      }
    },
    [onChange],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
        여행지
      </label>

      {/* Destination text + map toggle */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="예: 도쿄, 일본"
          className="flex-1 px-4 py-3 rounded-2xl border border-[#F0EEE6] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setMapOpen(!mapOpen)}
          className={`shrink-0 px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
            mapOpen
              ? 'bg-[#FF6B6B] text-white'
              : 'bg-white border border-[#F0EEE6] text-gray-500 hover:border-[#FF6B6B]/40'
          }`}
        >
          {mapOpen ? '지도 닫기' : '지도에서 선택'}
        </button>
      </div>

      {/* Selected location badge */}
      {value.lat != null && value.lng != null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium px-2.5 py-1 rounded-full">
            <span>📍</span>
            {value.name || `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`}
          </span>
          <button
            type="button"
            onClick={() => onChange(EMPTY_DESTINATION)}
            className="text-xs text-gray-400 hover:text-[#FF6B6B] transition-colors cursor-pointer"
          >
            초기화
          </button>
        </div>
      )}

      {/* Expandable map */}
      {mapOpen && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-[#F0EEE6] relative">
          {geocoding && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <span className="text-sm text-gray-500 animate-pulse">
                위치 정보를 가져오는 중...
              </span>
            </div>
          )}
          <div className="h-[260px]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <span className="text-sm text-gray-400 animate-pulse">
                    지도를 불러오는 중...
                  </span>
                </div>
              }
            >
              <DestinationMap
                selectedLat={value.lat}
                selectedLng={value.lng}
                onSelect={handleMapSelect}
              />
            </Suspense>
          </div>
          <p className="text-[11px] text-gray-400 text-center py-2 bg-gray-50">
            지도를 클릭하여 여행지를 선택하세요
          </p>
        </div>
      )}
    </div>
  );
}
