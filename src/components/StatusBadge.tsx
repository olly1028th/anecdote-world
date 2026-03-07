import { memo } from 'react';
import type { TripStatus } from '../types/trip';

interface Props {
  status: TripStatus;
}

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  completed: { bg: 'bg-[#0d9488] text-white', label: 'Visited' },
  planned: { bg: 'bg-[#eab308] text-slate-900', label: 'Planned' },
  wishlist: { bg: 'bg-[#6366f1] text-white', label: 'Wish' },
};

export default memo(function StatusBadge({ status }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.planned;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 border-slate-900 ${style.bg}`}
    >
      {style.label}
    </span>
  );
})
