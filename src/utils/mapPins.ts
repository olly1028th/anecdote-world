import type { Pin } from '../types/database';

/**
 * 세계지도에 표시할 핀 목록을 계산한다.
 *
 * 규칙:
 * - 좌표가 (0, 0)인 핀은 제외 (미등록 좌표)
 * - day_number가 없는(null) 핀만 포함 (여행 대표 핀)
 * - day_number가 있는 핀은 제외 (일정 상세 장소 — DayRouteMap 전용)
 */
export function getMapDisplayPins(allPins: Pin[]): Pin[] {
  return allPins.filter(
    (p) => !(p.lat === 0 && p.lng === 0) && p.day_number == null,
  );
}
