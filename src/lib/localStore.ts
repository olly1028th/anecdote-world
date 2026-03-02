/**
 * 사용자가 직접 등록한 로컬 여행/핀 데이터 관리 (localStorage 영구 보관)
 *
 * - Supabase 미설정(데모 모드) 시 주 저장소로 사용
 * - Supabase INSERT 실패 시 fallback 저장소로 사용
 */
import type { Trip } from '../types/trip';
import type { Pin } from '../types/database';

// ---- localStorage 키 ----
const LOCAL_TRIPS_KEY = 'anecdote-demo-trips';
const LOCAL_DELETED_KEY = 'anecdote-demo-deleted';
const LOCAL_PINS_KEY = 'anecdote-demo-pins';

// ============================================================
// 여행 (Trip) 로컬 저장소
// ============================================================

function loadLocalTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

function loadDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** 사용자가 로컬에 추가한 여행 목록 (모듈 레벨 캐시) */
let localTrips: Trip[] = loadLocalTrips();
/** 사용자가 삭제한 여행 ID */
const deletedTripIds: Set<string> = loadDeletedIds();

/** 사용자 로컬 여행 목록 반환 */
export function getLocalTrips(): Trip[] {
  return localTrips;
}

/** 삭제된 여행 ID 목록 반환 */
export function getDeletedTripIds(): Set<string> {
  return deletedTripIds;
}

/** 로컬 여행 목록 반환 (삭제된 ID 제외) */
export function getMergedDemoTrips(): Trip[] {
  return localTrips.filter((t) => !deletedTripIds.has(t.id));
}

/** 여행 로컬 추가 */
export function addLocalTrip(trip: Trip) {
  localTrips = [trip, ...localTrips];
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(localTrips));
  // 삭제 기록에서 제거 (같은 ID로 다시 추가하는 경우)
  if (deletedTripIds.has(trip.id)) {
    deletedTripIds.delete(trip.id);
    localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify([...deletedTripIds]));
  }
}

/** 여행 로컬 수정 */
export function updateLocalTrip(id: string, updates: Partial<Trip>) {
  const idx = localTrips.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const next = localTrips.map((t) =>
    t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
  );
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(next));
  localTrips = next;
}

/** 여행 로컬 삭제 */
export function deleteLocalTrip(id: string) {
  localTrips = localTrips.filter((t) => t.id !== id);
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(localTrips));
  deletedTripIds.add(id);
  localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify([...deletedTripIds]));
}

/** 로컬 여행 제거 (동기화 성공 후 정리용, 삭제 기록에 추가하지 않음) */
export function removeLocalTrip(id: string) {
  localTrips = localTrips.filter((t) => t.id !== id);
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(localTrips));
}

// ============================================================
// 핀 (Pin) 로컬 저장소
// ============================================================

function loadLocalPins(): Pin[] {
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY);
    return raw ? (JSON.parse(raw) as Pin[]) : [];
  } catch {
    return [];
  }
}

/** 사용자가 로컬에 추가한 핀 목록 (모듈 레벨 캐시) */
let localPins: Pin[] = loadLocalPins();

/** 사용자 로컬 핀 목록 반환 */
export function getLocalPins(): Pin[] {
  return localPins;
}

/** 핀 로컬 추가 */
export function addLocalPin(pin: Pin) {
  localPins = [pin, ...localPins];
  localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(localPins));
}

/** 로컬 핀 제거 (동기화 성공 후 정리용) */
export function removeLocalPin(id: string) {
  localPins = localPins.filter((p) => p.id !== id);
  localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(localPins));
}
