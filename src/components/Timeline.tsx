import type { ItineraryItem } from '../types/trip';

interface Props {
  items: ItineraryItem[];
}

export default function Timeline({ items }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Itinerary</h3>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item.day} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#f48c25] border-2 border-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 retro-shadow">
                D{item.day}
              </div>
              {idx < items.length - 1 && (
                <div className="w-1 flex-1 bg-slate-200 my-1 rounded-full" />
              )}
            </div>
            <div className="pb-4 flex-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.title}</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
