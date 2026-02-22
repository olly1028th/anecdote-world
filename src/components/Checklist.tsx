import type { ChecklistItem } from '../types/trip';

interface Props {
  items: ChecklistItem[];
  onToggle?: (index: number) => void;
}

export default function Checklist({ items, onToggle }: Props) {
  const done = items.filter((i) => i.checked).length;

  return (
    <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">Checklist</h3>
          <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border-2 border-[#2D3436] bg-[#4ECDC4]/20">
          {done}/{items.length}
        </span>
      </div>
      {/* 진행률 바 */}
      <div className="w-full h-3 bg-[#F9F4E8] rounded-full border-2 border-[#2D3436]/10 mb-4 overflow-hidden">
        <div
          className="h-full bg-[#4ECDC4] rounded-full transition-all duration-500"
          style={{ width: items.length > 0 ? `${(done / items.length) * 100}%` : '0%' }}
        />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <label
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F4E8] border-2 border-[#2D3436]/10 hover:border-[#2D3436]/30 cursor-pointer transition-colors"
          >
            <div
              onClick={onToggle ? (e) => { e.preventDefault(); onToggle(i); } : undefined}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                item.checked
                  ? 'bg-[#4ECDC4] border-[#2D3436]'
                  : 'border-[#2D3436]/30 bg-white'
              }`}
            >
              {item.checked && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm font-bold ${
                item.checked ? 'line-through text-[#2D3436]/30' : 'text-[#2D3436]'
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
