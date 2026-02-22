import type { TripStatus } from '../types/trip';

interface Props {
  status: TripStatus;
}

export default function StatusBadge({ status }: Props) {
  const isCompleted = status === 'completed';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 border-slate-900 ${
        isCompleted
          ? 'bg-[#0d9488] text-white'
          : 'bg-[#eab308] text-slate-900'
      }`}
    >
      {isCompleted ? 'Visited' : 'Planned'}
    </span>
  );
}
