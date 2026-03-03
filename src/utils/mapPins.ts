import type { Pin } from '../types/database';

/**
 * 세계지도에 표시할 핀 목록을 계산한다.
 *
 * 기본 규칙:
 * - 좌표가 (0, 0)인 핀은 제외 (미등록 좌표)
 * - day_number가 없는(null) 핀은 항상 포함
 * - day_number가 있는 핀은 기본적으로 제외 (세부 일정용)
 *
 * 추가 규칙 (여행-지도 정합성):
 * - 특정 여행(trip_id)에 day_number == null 핀이 하나도 없지만
 *   day_number != null 핀(유효 좌표)이 있으면,
 *   그 중 첫 번째 핀을 대표 핀으로 포함하여 지도에 표시한다.
 * - 이를 통해 일정 편집으로 trip-level 핀이 사라진 여행도
 *   세계지도에 최소 1개의 마커가 표시된다.
 */
export function getMapDisplayPins(allPins: Pin[]): Pin[] {
  // 유효 좌표 핀만 대상
  const validPins = allPins.filter(
    (p) => !(p.lat === 0 && p.lng === 0),
  );

  // day_number == null → 메인 핀 (항상 표시)
  const mainPins = validPins.filter((p) => p.day_number == null);

  // 이미 메인 핀이 있는 trip_id 수집
  const tripIdsWithMainPin = new Set<string>();
  for (const p of mainPins) {
    if (p.trip_id) tripIdsWithMainPin.add(p.trip_id);
  }

  // day_number != null 핀 중, 메인 핀이 없는 여행의 대표 핀 수집
  const representativeByTrip = new Map<string, Pin>();
  for (const p of validPins) {
    if (
      p.day_number != null &&
      p.trip_id &&
      !tripIdsWithMainPin.has(p.trip_id) &&
      !representativeByTrip.has(p.trip_id)
    ) {
      representativeByTrip.set(p.trip_id, p);
    }
  }

  return [...mainPins, ...representativeByTrip.values()];
}
