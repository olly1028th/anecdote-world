import type { ReactNode } from 'react';
import type { ChecklistItem } from '../types/trip';

interface Props {
  items: ChecklistItem[];
  onToggle?: (index: number) => void;
  action?: ReactNode;
}

export default function Checklist({ items, onToggle, action }: Props) {
  const done = items.filter((i) => i.checked).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Checklist</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border-2 border-[#0d9488] bg-[#0d9488]/10 text-[#0d9488]">
            {done}/{items.length}
          </span>
          {action}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <label
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F4E8] dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-[#f48c25] cursor-pointer transition-colors"
          >
            <div
              role="checkbox"
              aria-checked={item.checked}
              aria-label={item.text}
              tabIndex={onToggle ? 0 : undefined}
              onClick={onToggle ? (e) => { e.preventDefault(); onToggle(i); } : undefined}
              onKeyDown={onToggle ? (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(i); } } : undefined}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                item.checked
                  ? 'bg-[#0d9488] border-slate-900'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {item.checked && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-bold ${item.checked ? 'line-through text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
