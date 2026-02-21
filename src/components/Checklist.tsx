import type { ChecklistItem } from '../types/trip';

interface Props {
  items: ChecklistItem[];
  onToggle?: (index: number) => void;
}

export default function Checklist({ items, onToggle }: Props) {
  const done = items.filter((i) => i.checked).length;

  return (
    <div className="bg-white rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">준비 체크리스트</h3>
        <span className="text-xs text-gray-400">
          {done}/{items.length} 완료
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <label
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div
              onClick={onToggle ? (e) => { e.preventDefault(); onToggle(i); } : undefined}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                item.checked
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-gray-300'
              }`}
            >
              {item.checked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${
                item.checked ? 'line-through text-gray-400' : 'text-gray-700'
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
