# PC/모바일 브라우저 데이터 저장 로직

> 최종 업데이트: 2026-03-03 (스탯/검색/지도 일관성 수정 후)

## 핵심: PC와 모바일은 동일한 코드를 실행한다

로직 분기 없음. 차이는 **저장소 격리**와 **동기화 타이밍**에서 발생.

---

## 데이터 저장 흐름 (여행 추가 시)

```
사용자: "+" 클릭 → TripFormModal 제출
              │
              ▼
┌─ Supabase 설정됨 + 로그인됨? ────────────────────────┐
│                                                      │
│  YES                              NO (데모 모드)      │
│  │                                │                  │
│  ▼                                ▼                  │
│  createTrip() → DB INSERT         addDemoTrip()      │
│  │                                → localStorage     │
│  ├─ 성공 → DB에 저장됨 ✓           │                  │
│  │   └─ createPin() → DB INSERT   addDemoPin()       │
│  │       ├─ 성공 → DB에 저장됨 ✓   → localStorage     │
│  │       └─ 실패 → addDemoPin()                      │
│  │                 → localStorage                    │
│  │                                                   │
│  └─ 실패 → addDemoTrip()                              │
│             + addDemoPin()                            │
│             → localStorage                           │
└──────────────────────────────────────────────────────┘
              │
              ▼
        dispatch('trip-added')  → useTrips refetch
        dispatch('pin-added')   → usePins refetch
```

---

## 데이터 읽기 흐름 (페이지 로드 시)

```
useTrips() / usePins() 호출
              │
              ▼
┌─ Supabase 설정됨? ─────────────────────────────────────┐
│                                                        │
│  NO → 로컬만 반환                                       │
│       getLocalTrips().filter(!deletedTripIds)           │
│       getLocalPins().filter(!deletedPinIds)             │
│                                                        │
│  YES → 로그인 확인                                      │
│        │                                               │
│    ┌───┴────────────────────┐                          │
│   NO (미로그인)            YES (로그인됨)                 │
│    │                        │                          │
│    ▼                        ▼                          │
│  로컬만 반환          DB 조회 (user_id 필터)             │
│                       + 공유 trips/pins                │
│                       + 로컬 fallback 병합              │
│                       │                                │
│                       ▼                                │
│                  setTrips([                             │
│                    ...dbTrips,                          │
│                    ...localTrips  ← DB에 없는 것만      │
│                  ])                                     │
└────────────────────────────────────────────────────────┘
```

---

## 저장소별 역할

```
┌──────────────────────────────────────────────────────────┐
│  Supabase DB                                             │
│  ├─ 역할: 정본(source of truth)                           │
│  ├─ 범위: 로그인 사용자 전용, 모든 기기에서 접근 가능         │
│  └─ 한계: 오프라인/INSERT 실패 시 사용 불가                  │
├──────────────────────────────────────────────────────────┤
│  localStorage (기기별 독립)                                │
│  ├─ 역할: Supabase INSERT 실패 시 fallback 저장소           │
│  ├─ 키:                                                  │
│  │   anecdote-demo-trips        ← 로컬 여행 데이터         │
│  │   anecdote-demo-pins         ← 로컬 핀 데이터           │
│  │   anecdote-demo-deleted      ← 삭제된 trip ID (tombstone)│
│  │   anecdote-demo-deleted-pins ← 삭제된 pin ID (tombstone) │
│  │   anecdote-sync-lock         ← 동기화 중복 방지 (30초)    │
│  └─ 한계: 기기 간 공유 안 됨, 브라우저 데이터 삭제 시 소실     │
└──────────────────────────────────────────────────────────┘
```

---

## 기기 간 동기화 메커니즘

```
┌─ 동기화 트리거 ─────────────────────────────────────────┐
│                                                        │
│  1. 앱 시작 (로그인 시)                                  │
│     AuthContext → syncLocalDataToSupabase()             │
│     └─ localStorage → Supabase 업로드 시도               │
│     └─ 성공 시 localStorage에서 제거                     │
│                                                        │
│  2. 탭/앱 활성화 (visibilitychange)                      │
│     useTrips + usePins 리스너                            │
│     └─ 마지막 fetch로부터 30초 이상 경과 시                 │
│     └─ Supabase에서 최신 데이터 refetch                   │
│     └─ 결과: 다른 기기에서 추가한 데이터 반영               │
│                                                        │
│  3. 커스텀 이벤트 (같은 탭 내에서만)                       │
│     'trip-added' → useTrips refetch                     │
│     'pin-added'  → usePins refetch                      │
└────────────────────────────────────────────────────────┘
```

---

## PC ↔ 모바일 시나리오별 동작

| 시나리오 | 동작 |
|---------|------|
| **PC에서 여행 추가 → 모바일에서 확인** | PC: DB 저장 성공 → 모바일: 탭 활성화 시 30초 경과했으면 자동 refetch → 반영 |
| **모바일에서 여행 추가 → PC에서 확인** | 동일 (양방향 대칭) |
| **오프라인에서 추가 → 다른 기기** | 오프라인 기기: localStorage 저장 → 온라인 복귀 후 `syncLocal` 실행 → DB 업로드 → 다른 기기: refetch 시 반영 |
| **양쪽에서 동시 편집** | Last-write-wins (충돌 감지 없음, Supabase UPDATE 순서에 의존) |
| **한쪽에서 삭제** | DB DELETE 성공 → 다른 기기: refetch 시 사라짐. 실패 → `deletedTripIds`/`deletedPinIds`로 로컬에서 숨김 |

---

## 삭제 로직 (tombstone 패턴)

```
삭제 요청
    │
    ├─ Supabase DELETE 성공 → DB에서 제거됨
    │   └─ 다른 기기: refetch 시 자연스럽게 사라짐
    │
    └─ Supabase DELETE 실패 (또는 데모 모드)
        ├─ trips: deletedTripIds.add(id)
        │         → localStorage 'anecdote-demo-deleted'에 기록
        │         → useTrips fetch 시 이 ID 제외
        │
        └─ pins:  deletedPinIds.add(id)
                  → localStorage 'anecdote-demo-deleted-pins'에 기록
                  → usePins fetch 시 이 ID 제외
```

---

## 스탯카드/검색/지도가 같은 데이터를 보는 구조

```
useTrips() → trips[] ─────┬──→ 스탯카드 (trip 수, 지출, 사진, 체크리스트)
                          ├──→ 검색필터 (title/destination/memo 검색)
                          └──→ 탭별 하위 리스트 (completed/planned/wishlist)

usePins()  → pins[] ──────┬──→ 스탯카드 국가/도시 (전체 핀 텍스트 기반, 좌표 필터 독립)
                          ├──→ 스탯카드 핀 카테고리/상태 (getMapDisplayPins 기준)
                          └──→ 세계지도 마커 (getMapDisplayPins 기준)
```

### 필터링 기준 차이

| 영역 | 데이터 소스 | 필터 |
|------|-----------|------|
| 스탯 국가/도시 | 전체 `pins[]` | `visit_status === 'visited'` + `country`/`city` 텍스트 비어있지 않은 것 |
| 스탯 핀 카테고리/상태 | `getMapDisplayPins(pins)` | (0,0) 제외 + day_number 필터 |
| 세계지도 마커 | `getMapDisplayPins(pins)` | 동일 + HomePage에서 status 필터 추가 |
| 검색필터 | `trips[]` | statusFilter + searchQuery (title/destination/memo) |
| 탭별 리스트 | `trips[]` | `status` 고정 분류 (검색필터 영향 안 받음) |

---

## 관련 소스 파일

| 파일 | 역할 |
|------|------|
| `src/hooks/useTrips.ts` | trip 데이터 fetch + DB/로컬 병합 + visibility refetch |
| `src/hooks/usePins.ts` | pin 데이터 fetch + DB/로컬 병합 + deletedPinIds 필터 + visibility refetch |
| `src/hooks/useStats.ts` | trip/pin 기반 통계 계산 (국가/도시는 좌표 필터 독립) |
| `src/lib/localStore.ts` | localStorage CRUD + tombstone (deletedTripIds, deletedPinIds) |
| `src/lib/syncLocal.ts` | 앱 시작 시 localStorage → Supabase 업로드 |
| `src/utils/mapPins.ts` | 세계지도 표시용 핀 필터 (getMapDisplayPins) |
| `src/components/TripFormModal.tsx` | 여행 생성 → trip + pin 저장 + 이벤트 dispatch |
| `src/contexts/AuthContext.tsx` | 로그인 감지 → syncLocal 트리거 |
