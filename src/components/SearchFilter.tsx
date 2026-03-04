import { useState, useEffect, useRef, useCallback } from 'react';
import type { TripStatus } from '../types/trip';

interface Props {
  onSearch: (query: string) => void;
  onFilterChange: (status: TripStatus | 'all') => void;
  activeFilter: TripStatus | 'all';
  tripCounts: { all: number; completed: number; planned: number; wishlist: number };
}

const FILTERS: { key: TripStatus | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'border-slate-400 bg-slate-400' },
  { key: 'completed', label: 'Visited', color: 'border-[#0d9488] bg-[#0d9488]' },
  { key: 'planned', label: 'Planned', color: 'border-[#eab308] bg-[#eab308]' },
  { key: 'wishlist', label: 'Wish', color: 'border-[#6366f1] bg-[#6366f1]' },
];

export default function SearchFilter({ onSearch, onFilterChange, activeFilter, tripCounts }: Props) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; });

  const debouncedSearch = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchRef.current(value);
    }, 250);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (!value) {
      // 빈 값은 즉시 반영 (clear 버튼)
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(value);
    } else {
      debouncedSearch(value);
    }
  };

  return (
    <div className="space-y-3">
      {/* 검색바 */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search missions..."
          aria-label="여행 검색"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-[#f48c25] placeholder:text-slate-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer bg-transparent border-0 p-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => {
          const count = tripCounts[f.key as keyof typeof tripCounts] ?? 0;
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? `${f.color} text-white border-slate-900`
                  : 'bg-white dark:bg-[#2a1f15] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400'
              }`}
            >
              {f.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
