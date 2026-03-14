import { useRef, useEffect, type ReactNode } from 'react';

export type DetailTab = 'schedule' | 'photos' | 'diary' | 'checklist' | 'expenses';

interface TabItem {
  key: DetailTab;
  label: string;
  icon: ReactNode;
}

const tabs: TabItem[] = [
  {
    key: 'schedule',
    label: '일정',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'photos',
    label: '사진',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'diary',
    label: '일기',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    key: 'checklist',
    label: '체크리스트',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'expenses',
    label: '가계부',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// 탭별 강조 색상
const tabColors: Record<DetailTab, string> = {
  schedule: '#f48c25',
  photos: '#f43f5e',
  diary: '#6366f1',
  checklist: '#0d9488',
  expenses: '#eab308',
};

interface DetailTabsProps {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}

export default function DetailTabs({ active, onChange }: DetailTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // 활성 탭이 보이도록 자동 스크롤
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-[var(--color-bg)]">
      <div
        ref={containerRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const color = tabColors[tab.key];
          return (
            <button
              key={tab.key}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex flex-col items-center gap-1 shrink-0 w-16 py-2.5 rounded-xl text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                isActive
                  ? 'border-[3px] border-slate-900 dark:border-slate-100 text-white shadow-[3px_3px_0px_0px_rgba(28,20,13,1)]'
                  : 'border-[2px] border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-400 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
