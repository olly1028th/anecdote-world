import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SearchResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface Props {
  initialQuery: string;
  onSelect: (lat: number, lng: number, name?: string) => void;
  onClose: () => void;
}

const selectedIcon = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
  html: `<div style="
    width:32px;height:32px;display:flex;align-items:center;justify-content:center;
  "><svg viewBox="0 0 24 24" width="32" height="32" fill="#f48c25" stroke="#1c140d" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg></div>`,
});

const resultIcon = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -26],
  html: `<div style="
    width:24px;height:24px;display:flex;align-items:center;justify-content:center;
  "><svg viewBox="0 0 24 24" width="24" height="24" fill="#0d9488" stroke="#1c140d" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg></div>`,
});

/** 지도 중심 및 줌 변경 */
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [map, lat, lng, zoom]);
  return null;
}

/** 지도 클릭 시 위치 선택 */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onMapClick]);
  return null;
}

export default function PlaceSearchModal({ initialQuery, onSelect, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 모달 열릴 때 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 초기 쿼리가 있으면 자동 검색
  useEffect(() => {
    if (initialQuery.trim()) {
      searchPlaces(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchPlaces = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=ko`,
      );
      const data = await res.json();
      const mapped: SearchResult[] = data.map((item: { display_name: string; lat: string; lon: string; name?: string }) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setResults(mapped);
      // 결과가 있으면 첫 번째 결과로 지도 이동
      if (mapped.length > 0) {
        setFlyTarget({ lat: mapped[0].lat, lng: mapped[0].lng, zoom: 14 });
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 2) {
        searchPlaces(value.trim());
      }
    }, 500);
  };

  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchPlaces(query.trim());
  };

  const handleResultClick = (result: SearchResult) => {
    setSelected({ lat: result.lat, lng: result.lng });
    setFlyTarget({ lat: result.lat, lng: result.lng, zoom: 16 });
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelected({ lat, lng });
  }, []);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border-[3px] border-slate-900 retro-shadow overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">장소 검색</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="장소명 검색 (예: 에펠탑, 시부야)"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#f48c25] border-2 border-slate-900 hover:bg-[#d97a1e] cursor-pointer disabled:opacity-50 transition-colors"
            >
              {searching ? '...' : '검색'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1.5">지도를 직접 클릭하여 위치를 선택할 수도 있습니다</p>
        </div>

        {/* 지도 */}
        <div className="relative" style={{ height: '220px' }}>
          <MapContainer
            center={[36.5, 127.5]}
            zoom={6}
            className="w-full h-full z-0"
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}
            <MapClickHandler onMapClick={handleMapClick} />

            {/* 검색 결과 마커 */}
            {results.map((r, i) => (
              <Marker
                key={`result-${i}`}
                position={[r.lat, r.lng]}
                icon={selected?.lat === r.lat && selected?.lng === r.lng ? selectedIcon : resultIcon}
                eventHandlers={{ click: () => handleResultClick(r) }}
              >
                <Popup>
                  <div style={{ minWidth: '140px' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '3px 0 0', lineHeight: '1.3' }}>
                      {r.displayName.length > 60 ? r.displayName.slice(0, 60) + '...' : r.displayName}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 직접 클릭으로 선택한 위치 (검색결과와 다른 위치) */}
            {selected && !results.some((r) => r.lat === selected.lat && r.lng === selected.lng) && (
              <Marker position={[selected.lat, selected.lng]} icon={selectedIcon}>
                <Popup>
                  <p style={{ fontWeight: 600, fontSize: '12px', margin: 0 }}>선택한 위치</p>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* 검색 결과 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ maxHeight: '180px' }}>
          {results.length > 0 ? (
            <div className="space-y-1.5">
              {results.map((r, i) => {
                const isSelected = selected?.lat === r.lat && selected?.lng === r.lng;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleResultClick(r)}
                    className={`w-full text-left p-2.5 rounded-xl border-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#f48c25] bg-[#f48c25]/10'
                        : 'border-slate-200 dark:border-slate-600 bg-[#F9F4E8] dark:bg-slate-700 hover:border-[#f48c25]/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <svg className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-[#f48c25]' : 'text-[#0d9488]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{r.displayName}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searching ? (
            <p className="text-[10px] text-slate-400 font-medium text-center py-4 animate-pulse">검색 중...</p>
          ) : query.trim() ? (
            <p className="text-[10px] text-slate-400 font-medium text-center py-4">검색 결과가 없습니다. 지도를 클릭하여 직접 선택해보세요.</p>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium text-center py-4">장소명을 입력하고 검색하세요</p>
          )}
        </div>

        {/* 확인/취소 버튼 */}
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-slate-500 bg-white border-2 border-slate-900 cursor-pointer hover:bg-gray-50 transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 retro-shadow hover:bg-[#d97a1e] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-30"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
