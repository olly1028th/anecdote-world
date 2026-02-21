import type { TripStatus } from '../types/trip';

interface Props {
  status: TripStatus;
}

export default function StatusBadge({ status }: Props) {
  const isCompleted = status === 'completed';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        isCompleted
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isCompleted ? '완료' : '계획 중'}
    </span>
  );
}
