import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import type { DestinationInfo } from '../types/destination';
import { EMPTY_DESTINATION } from '../types/destination';

const DestinationMap = lazy(() => import('./DestinationMap'));

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Props {
  value: DestinationInfo;
  onChange: (info: DestinationInfo) => void;
}

export default function DestinationPicker({ value, onChange }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 지도 클릭 → 역지오코딩
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
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
      } catch {
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

  // 검색어 변경 → 디바운스 검색
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&accept-language=ko&limit=5&addressdetails=1`,
        );
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  // 검색 결과 선택
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const addr = result.address ?? {};
      const city =
        addr.city || addr.town || addr.village || addr.county || addr.state || '';
      const country = addr.country || '';
      const name = [city, country].filter(Boolean).join(', ') || result.display_name.split(',').slice(0, 2).join(',');

      onChange({ name, lat, lng, country, city });
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);

      if (mapOpen) {
        setFlyTarget({ lat, lng });
      }
    },
    [onChange, mapOpen],
  );

  const toggleMap = useCallback(() => {
    setMapOpen((prev) => !prev);
    setShowResults(false);
  }, []);

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-[#1c140d]/60 mb-2">
        Destination
      </label>

      {/* 여행지 텍스트 입력 + 지도 토글 버튼 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="예: 도쿄, 일본"
          className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
        />
        <button
          type="button"
          onClick={toggleMap}
          className={`shrink-0 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-tight transition-all cursor-pointer border-2 border-slate-900 ${
            mapOpen
              ? 'bg-[#f48c25] text-white shadow-[3px_3px_0px_0px_#1c140d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#1c140d]'
              : 'bg-white text-[#1c140d]/60 hover:bg-[#f48c25]/10'
          }`}
        >
          {mapOpen ? 'Close' : 'Map'}
        </button>
      </div>

      {/* 선택된 여행지 뱃지 */}
      {value.lat != null && value.lng != null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#f48c25] text-white px-3 py-1.5 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1c140d]">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {value.name || `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(EMPTY_DESTINATION);
              setFlyTarget(null);
            }}
            className="text-[10px] font-bold text-[#1c140d]/40 hover:text-[#f48c25] transition-colors cursor-pointer uppercase tracking-wider"
          >
            Reset
          </button>
        </div>
      )}

      {/* 펼침 가능 지도 영역 */}
      {mapOpen && (
        <div className="mt-3 rounded-xl overflow-hidden border-[3px] border-slate-900 retro-shadow relative">
          {/* 검색바 */}
          <div className="relative bg-[#F9F4E8] p-3 border-b-2 border-slate-900">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1c140d]/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search destination..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border-2 border-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25]"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl border-2 border-slate-900 retro-shadow z-[1100] max-h-[200px] overflow-y-auto">
                {searchResults.map((result, i) => {
                  const addr = result.address ?? {};
                  const city = addr.city || addr.town || addr.village || addr.county || '';
                  const country = addr.country || '';
                  const shortName = [city, country].filter(Boolean).join(', ') || result.display_name.split(',').slice(0, 2).join(', ');
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleResultSelect(result)}
                      className="w-full text-left px-4 py-3 hover:bg-[#eab308]/20 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl border-b-2 border-slate-900/10 last:border-b-0"
                    >
                      <p className="text-sm font-bold text-[#1c140d] truncate">
                        {shortName}
                      </p>
                      <p className="text-[10px] text-[#1c140d]/40 truncate mt-0.5 uppercase tracking-wider">
                        {result.display_name}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 지오코딩 로딩 오버레이 */}
          {geocoding && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#F9F4E8]/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1c140d]">
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                <span className="text-sm font-bold text-[#1c140d]">
                  Loading...
                </span>
              </div>
            </div>
          )}

          {/* 지도 */}
          <div className="h-[280px]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-[#F9F4E8]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    <span className="text-sm font-bold text-[#1c140d]/60">
                      Loading map...
                    </span>
                  </div>
                </div>
              }
            >
              <DestinationMap
                selectedLat={value.lat}
                selectedLng={value.lng}
                flyTo={flyTarget}
                onSelect={handleMapSelect}
              />
            </Suspense>
          </div>

          {/* 하단 안내 */}
          <div className="bg-[#1c140d] px-4 py-2 flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
              Click map or search above
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
