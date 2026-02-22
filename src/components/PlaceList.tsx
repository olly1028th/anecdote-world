import type { Place } from '../types/trip';

interface Props {
  places: Place[];
}

const priorityConfig = {
  must: { label: '필수', bg: 'bg-[#f43f5e] text-white', border: 'border-[#f43f5e]' },
  want: { label: '가고싶음', bg: 'bg-[#eab308]', border: 'border-[#eab308]' },
  maybe: { label: '여유되면', bg: 'bg-slate-100', border: 'border-slate-300' },
} as const;

export default function PlaceList({ places }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Route & Places</h3>
      <div className="space-y-2.5">
        {places.map((place, i) => {
          const config = priorityConfig[place.priority];
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-[#F9F4E8] dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{place.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${config.border} ${config.bg}`}>
                    {config.label}
                  </span>
                </div>
                {place.note && (
                  <p className="text-xs text-slate-500 font-medium mt-1">{place.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
