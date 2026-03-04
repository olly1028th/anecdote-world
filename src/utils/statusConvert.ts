import type { TripStatus } from '../types/trip';
import type { VisitStatus } from '../types/database';

/** 여행 상태 → 핀 방문 상태 변환 */
export function tripStatusToPinStatus(status: TripStatus): VisitStatus {
  if (status === 'completed') return 'visited';
  if (status === 'wishlist') return 'wishlist';
  return 'planned';
}
