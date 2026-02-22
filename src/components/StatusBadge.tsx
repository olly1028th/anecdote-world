import type { TripStatus } from '../types/trip';

interface Props {
  status: TripStatus;
}

export default function StatusBadge({ status }: Props) {
  const isCompleted = status === 'completed';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436] ${
        isCompleted
          ? 'bg-[#4ECDC4] text-[#2D3436]'
          : 'bg-[#FFD166] text-[#2D3436]'
      }`}
    >
      {isCompleted ? 'Visited' : 'Planned'}
    </span>
  );
}
