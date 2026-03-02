# Anecdote World — Team Review Dashboard

> **분석일**: 2026-03-02
> **분석 대상**: 전체 소스코드 (`src/`, `supabase/`, `docs/`)
> **분석 방법**: 5명의 전문가 에이전트가 동시에 독립 분석 후 종합

---

## Team Composition

```
┌─────────────────────────────────────────────────────────────────┐
│                    Anecdote World Review Team                   │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ Backend  │ Frontend │    QA    │  UI/UX   │  Service Planner    │
│   Dev    │   Dev    │ Engineer │ Designer │     (기획자)         │
├──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ Supabase │ React    │ Build &  │ 디자인    │ 사용자 여정          │
│ 쿼리/보안 │ 컴포넌트  │ Runtime  │ 일관성    │ 기능 완성도          │
│ 데이터모델│ 성능/상태 │ Bug Hunt │ 모바일UX  │ 경쟁사 분석          │
│ 동기화   │ 접근성    │ 엣지케이스│ 다크모드  │ 성장 전략            │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

---

## Executive Summary

```
종합 점수:  6.8 / 10

강점: ██████████████████░░  디자인 아이덴티티 (9.0)
     ████████████████░░░░  기술 안정성 (8.0)
     ███████████████░░░░░  핵심 기능 (7.5)

약점: ██████████░░░░░░░░░░  리텐션 요소 (5.0)
     ███████████░░░░░░░░░  소셜/바이럴 (5.5)
     ████████████░░░░░░░░  데이터 활용 (6.0)
```

**한줄 요약**: 독보적 네오브루탈리스트 디자인과 탄탄한 기술 기반의 MVP. 보안 이슈 즉시 수정 필요, "여행 관리 도구"에서 "여행 기록 앱"으로의 전환이 핵심 과제.

---

## Issue Overview

```
 심각도       건수    분포
─────────────────────────────────────────────────
 Critical  │  9건  │ ████████████████████░░░░░░░░░░
 High      │ 13건  │ ██████████████████████████████
 Medium    │ 16건  │ ██████████████████████████████
 Low       │ 12건  │ ████████████████████████░░░░░░
─────────────────────────────────────────────────
 합계        50건

 팀원별 발견 건수
─────────────────────────────────────────────────
 Backend Dev    │ 19건  │ ████████████████████████████
 Frontend Dev   │ 23건  │ ██████████████████████████████
 QA Engineer    │ 16건  │ ██████████████████████░░░░░░░
 UI/UX Designer │ 17건  │ ███████████████████████░░░░░░
 Service Planner│  —    │ (기능/전략 제안 중심)
─────────────────────────────────────────────────
```

---

## 1. Backend Developer Report

**분석 범위**: `src/hooks/`, `src/lib/`, `src/types/`, `src/contexts/`, `supabase/`

### Critical

| ID | 이슈 | 파일 | 상세 |
|----|------|------|------|
| C-1 | `useTrip` SELECT에 `user_id` 필터 누락 | `useTrips.ts:478-483` | `.eq('id', id)`만 사용, RLS 비활성 환경에서 타 사용자 데이터 노출. CLAUDE.md의 "모든 SELECT 쿼리는 반드시 user_id 필터 필요" 규칙 위반 |
| C-2 | `useSharesForTrip` 소유자 확인 없이 전체 공유 목록 노출 | `useShares.ts:57-63` | `trip_id`로만 필터하여 같은 여행에 초대받은 다른 사용자의 이메일까지 조회 가능 — 개인정보 노출 |
| C-3 | `get_user_id_by_email` RPC로 유저 열거 공격 가능 | `useShares.ts:219` | `SECURITY DEFINER`로 `auth.users` 직접 조회. 인증된 사용자가 임의 이메일의 가입 여부 + UUID 확인 가능 |

### High

| ID | 이슈 | 파일 | 상세 |
|----|------|------|------|
| H-1 | 경비/체크리스트 delete-then-insert — 트랜잭션 없음 | `useTrips.ts:304-365` | DELETE 성공 후 INSERT 실패 시 기존 데이터 전체 유실. `savePlaces`(370-425행)도 동일 |
| H-2 | `savePlaces` 좌표 보존이 이름 매칭 기반 | `useTrips.ts:385-405` | 장소 이름 변경 시 `coordMap.get(p.name)` 실패 → 좌표/country/city 유실. 핀 ID 기반 매칭 필요 |
| H-3 | 공유받은 여행의 핀 조회에서 `user_id` 필터 없음 | `usePins.ts:60-66` | `trip_id`로만 필터하여 소유자와 공유자의 핀이 혼재 가능 |
| H-4 | 공유 여행의 expenses/checklist RLS 정책 불완전 | `useTrips.ts:187-199` | 이메일 기반 공유에서 `invited_user_id`가 NULL이면 RLS 통과 못함 → 공유 여행 상세 데이터 빈 배열 |
| H-5 | Edge Function XSS 취약점 | `send-share-email/index.ts:59-63` | `owner_nickname`, `trip_title`, `app_url`이 HTML 이스케이프 없이 삽입. 피싱 URL 삽입도 가능 |
| H-6 | `syncLocal` 동시 실행 방지 취약 | `syncLocal.ts:17-19` | localStorage 기반 락은 멀티탭 race condition 발생. AuthContext에서 두 곳 동시 호출 가능(75행, 89행) |

### Medium

| ID | 이슈 | 파일 |
|----|------|------|
| M-1 | mutation마다 `getUser()` 서버 왕복 호출 | `useTrips.ts:139`, `usePins.ts:31` |
| M-2 | `.in()` 쿼리 PostgreSQL 파라미터 한도 미고려 | `useTrips.ts:188, 210` |
| M-3 | 이벤트 기반 refetch에 AbortController 미적용 | `useTrips.ts:249-253`, `usePins.ts:96-100` |
| M-4 | `useTrip` 단건 조회 관련 데이터에 `user_id` 필터 누락 | `useTrips.ts:508-520` |
| M-5 | `address` DB 컬럼을 `priority` 저장에 남용 | `useTrips.ts:69-72, 415` |
| M-6 | `savePlaces` 새 좌표 시 country/city 불일치 | `useTrips.ts:403-406` |
| M-7 | 모듈 레벨 캐시 멀티탭 stale 문제 | `localStore.ts:40-42` |
| M-8 | `createTrip`에서 input 객체 직접 spread — 필드 오버라이드 가능 | `useTrips.ts:278-281` |

### Low

| ID | 이슈 | 파일 |
|----|------|------|
| L-1 | `useStats`가 `useTrips()`+`usePins()` 이중 호출 | `useStats.ts:48-51` |
| L-2 | `listTripPhotos`에서 공유 여행 사진 조회 불가 | `storage.ts:68-76` |
| L-3 | `fetchProfile` 에러 미처리 | `AuthContext.tsx:56-63` |
| L-4 | Supabase 마이그레이션 파일이 `docs/`에 수동 관리 | `supabase/migrations/` 비어있음 |
| L-5 | `updateProfile` 성공 후 로컬 상태 미갱신 | `useProfile.ts:40-51` |
| L-6 | `useExchangeRate` 캐싱 부재 | `useExchangeRate.ts:72` |
| L-7 | `TripDetailPage`에서 `supabase` 직접 import/쿼리 | `TripDetailPage.tsx:4, 192, 416` |
| L-8 | `updated_at` 클라이언트/서버 이중 설정 | `useProfile.ts:46`, `localStore.ts:80` |

### 아키텍처 관찰

- **데모/Supabase 이중 경로 복잡성**: 모든 hook에 `if (!isSupabaseConfigured)` 분기 → 어댑터 패턴 분리 권장
- **fallback 저장소 참조 무결성**: 동기화 시 새 UUID 생성 → 기존 로컬 ID 참조 관계 파괴
- **`select('*')` 과다 사용**: 불필요한 컬럼 전송 → 필요 컬럼만 명시 권장

---

## 2. Frontend Developer Report

**분석 범위**: `src/components/`, `src/pages/`, `src/App.tsx`, `src/main.tsx`, `src/index.css`

### Critical

| ID | 이슈 | 파일 | 상세 |
|----|------|------|------|
| C-1 | TripDetailPage 1,180줄 God Component | `TripDetailPage.tsx` | 경비/체크리스트/장소/사진/공유/타임라인 전체가 단일 파일. 인라인 서브컴포넌트(`EditButton`, `SaveCancelButtons`) 포함. 유지보수/테스트 극도 어려움 |
| C-2 | 접근성(a11y) 전무 | 프로젝트 전체 | `aria-*` 속성 0건, `role` 속성 0건. 모달 포커스 트래핑 없음, Escape 닫기 미구현(`PhotoGallery` 제외), 아이콘 버튼 `aria-label` 없음, `<label>` 없는 `<input>` 다수. WCAG 2.1 Level A 미충족 |
| C-3 | 404 라우트 미정의 | `App.tsx:60-85` | catch-all `path="*"` 없음 → 잘못된 URL 접근 시 빈 화면 |
| C-4 | FitBounds useEffect 없이 매 렌더마다 실행 | `WorldMap.tsx:25-34` | 렌더 함수에서 `map.fitBounds()` 직접 호출 → 부모 리렌더 시 사용자 줌/패닝 초기화 |

### High

| ID | 이슈 | 파일 | 상세 |
|----|------|------|------|
| H-1 | HomePage 여행 목록 JSX 4회 중복 | `HomePage.tsx:276-486` | completed/planned/wishlist/검색결과 — 거의 동일 구조 반복. 1곳 변경 시 4곳 수정 필요 |
| H-2 | 다크모드 CSS `!important` 70줄 오버라이드 | `index.css:82-154` | Tailwind `dark:` variant 대신 `.dark .bg-white { !important }` 일괄 변환 → 예측 불가 색상 충돌 |
| H-3 | TripFormModal / TripFormPage 데모 저장 로직 중복 | 양 파일 | Trip 객체 생성 + localStore 저장 + 이벤트 dispatch 패턴 이중 구현 |
| H-4 | pinFilters 배열에서 동일 filter 6회 중복 실행 | `HomePage.tsx:117-153` | `mapPins.filter(...)` 동일 조건 6회, `useMemo` 없이 매 렌더마다 재계산 |
| H-5 | 검색 입력 디바운싱 미적용 | `SearchFilter.tsx:21-24` | 키 입력마다 `onSearch` 즉시 호출 → 전체 여행 목록 필터링 + 리렌더 |
| H-6 | WorldMap 팝업 HTML 문자열 XSS | `WorldMap.tsx:87-98` | `pin.name`, `pin.note` 등 사용자 입력이 이스케이프 없이 HTML 삽입. 공유 기능으로 타 사용자 공격 가능 |

### Medium

| ID | 이슈 | 파일 |
|----|------|------|
| M-1 | TripFormPage 렌더 중 setState 호출 | `TripFormPage.tsx:59-73` |
| M-2 | TripDetailPage useMemo/useCallback 0개 | `TripDetailPage.tsx` 전체 |
| M-3 | TripCard 이미지 `loading="lazy"` 누락 | `TripCard.tsx:31-35` |
| M-4 | SpaceTrips 100개 별 DOM + 개별 CSS 애니메이션 | `SpaceTrips.tsx:46, 75-87` |
| M-5 | 커스텀 이벤트 기반 동기화 — 타입 안전성 없음 | `useTrips.ts`, `usePins.ts`, `useShares.ts` |
| M-6 | 라우트 레벨 ErrorBoundary 부재 | `main.tsx` (루트만 존재) |
| M-7 | EXPENSE_CATEGORIES 상수 중복 정의 | `TripDetailPage.tsx:23`, `TripFormPage.tsx:15` |
| M-8 | WorldMap statusLabels/catLabels useEffect 내 매번 재생성 | `WorldMap.tsx:83-84` |

### Low

| ID | 이슈 | 파일 |
|----|------|------|
| L-1 | 매직 넘버 산재 (100, 15, 137.508 등) | SpaceTrips, WorldMap 전반 |
| L-2 | 인라인 SVG 아이콘 다수 파일 반복 | SearchFilter, TripCard, BottomNav, Header |
| L-3 | 하드코딩 색상값 — Tailwind theme.extend 미등록 | 프로젝트 전반 `bg-[#f48c25]` 등 |
| L-4 | Record<string> 타입 느슨한 키 정의 | `WorldMap.tsx:83-84`, `HomePage.tsx:391-392` |
| L-5 | 이미지 최적화 미흡 — srcset/sizes/Cloudinary 변환 미사용 | `TripCard.tsx`, `PhotoGallery.tsx` |

---

## 3. QA Engineer Report

**빌드 상태**: `npm run build` 성공, `npx tsc --noEmit` 성공 (타입 에러 0건)

### Bug Report

| Bug ID | 심각도 | 카테고리 | 이슈 | 파일 | 재현 조건 |
|--------|--------|---------|------|------|----------|
| BUG-001 | **High** | 렌더링/UX | FitBounds useEffect 미사용 — 지도 줌/패닝 초기화 | `WorldMap.tsx:25-33` | 세계지도 수동 조작 후 필터/다크모드 변경 |
| BUG-002 | **High** | 런타임 에러 | `formatDate('')` → `"NaN.NaN.NaN"` 출력 | `format.ts:5-15` | 날짜 미입력 위시리스트 여행 상세 진입 |
| BUG-003 | **Critical** | 보안 | useTrip SELECT에 user_id 필터 누락 | `useTrips.ts:478-482` | URL에 타 사용자 trip ID 직접 입력 |
| BUG-004 | **Medium** | 보안 | useSharesForTrip owner_id 필터 누락 | `useShares.ts:57-64` | 공유받은 여행에서 공유 패널 확인 |
| BUG-005 | **Medium** | UI 깨짐 | 커버 이미지 빈 문자열 → 깨진 이미지 아이콘 | `TripDetailPage.tsx:488-489` | 커버 이미지 없이 여행 생성 후 상세 진입 |
| BUG-006 | **Medium** | React 패턴 | 렌더 본문에서 setState 직접 호출 | `TripFormPage.tsx:59-73`, `PinFormPage.tsx:78-93` | 수정 페이지 진입 시 (StrictMode) |
| BUG-007 | **Medium** | Race Condition | useTrips/usePins fetch에 cancelled 플래그 없음 | `useTrips.ts:126-256`, `usePins.ts` 전체 | 여행 상세 페이지 간 빠른 전환 |
| BUG-008 | **Medium** | 데이터 유실 | 수정 모드 destination 좌표 미복원 | `TripFormPage.tsx:62-63` | 기존 여행 Edit → 제목만 변경 → 저장 |
| BUG-009 | **Medium** | 데이터 유실 | 장소 이름 변경 시 country/city 유실 | `useTrips.ts:370-426` | 좌표 등록된 장소 이름 변경 후 저장 |
| BUG-010 | **Low** | 메모리 릭 | PlaceSearchModal debounce cleanup 누락 | `PlaceSearchModal.tsx:74, 151-159` | 검색어 입력 후 500ms 내 모달 닫기 |
| BUG-011 | **Low** | 렌더링 | ToastItem onDone 인라인 함수 → 타이머 재설정 | `ToastContext.tsx:55-62` | 다수 토스트 연속 발생 시 |
| BUG-012 | **Low** | UX | 에러 토스트 중복 발생 (trip 의존성) | `TripDetailPage.tsx:429-433` | Supabase 연결 실패 + 데모 fallback |
| BUG-013 | **Low** | UI 표시 | wishlist 여행이 SpaceTrips에서 "계획 중"으로 표시 | `SpaceTrips.tsx:211-213` | 위시리스트 행성 호버 |
| BUG-014 | **Low** | UX | 수정 폼 로드 전 빈 폼 깜빡임 | `TripFormPage.tsx:32, 59-73` | `/trip/edit/:id` 페이지 진입 |
| BUG-015 | **Low** | 지도 | PinFormPage MapContainer center 초기값 고정 | `PinFormPage.tsx:174-176, 204-218` | 해외 핀 수정 시 (한국 중심 표시) |
| BUG-016 | **Medium** | 데이터 유실 | syncLocal 부분 동기화 → 경비/체크리스트 유실 | `syncLocal.ts:140-144` | 여행 INSERT 성공 + 경비 INSERT 실패 |

### 심각도 분포

```
 Critical:  1건  ▓░░░░░░░░░░░░░░░
 High:      2건  ▓▓░░░░░░░░░░░░░░
 Medium:    7건  ▓▓▓▓▓▓▓░░░░░░░░░
 Low:       6건  ▓▓▓▓▓▓░░░░░░░░░░
```

---

## 4. UI/UX Designer Report

**분석 범위**: 전체 컴포넌트/페이지/CSS — Tailwind 클래스 일관성, 디자인 시스템 준수, UX 플로우

### 강점 (잘 된 부분)

| 영역 | 평가 |
|------|------|
| **네오브루탈리스트 시스템** | `border-[3px]`, `retro-shadow`, active translate가 TripCard, TripFormModal, TripDetailPage, ConfirmModal, BottomNav FAB 등 핵심 UI 전반에 일관 적용 |
| **우주/행성 메타포** | SpaceTrips 궤도 회전 애니메이션, radial gradient 행성, 별 반짝임, 완료=화려한 행성 vs 계획=안개낀 행성 — 시각적으로 매우 우수 |
| **모바일 퍼스트** | BottomNav `min-w-[44px] min-h-[44px]` 터치 타겟, FAB `w-14 h-14`, `safe-area-inset-bottom`, 모달 바텀시트→센터 전환 |
| **로딩/빈 상태** | Skeleton 3종(Home/Detail/CardList) 실제 레이아웃 매칭, EmptyState 데코 요소로 테마 유지 |
| **토스트** | 입장/퇴장 애니메이션, 타입별 색상, 네오브루탈 보더+그림자 적용 |
| **타이포그래피** | Space Grotesk + `uppercase italic tracking-tighter/wider` — 레트로+우주 양쪽에 적합 |
| **인라인 편집** | TripDetailPage 각 섹션 Edit/Save/Cancel 패턴 통일 — 페이지 이탈 없는 편집 UX |

### 개선 제안

#### Critical

| ID | 이슈 | 파일 | 개선 방향 |
|----|------|------|----------|
| C1 | PinFormPage 네오브루탈리스트 스타일 전혀 미적용 | `PinFormPage.tsx:192-413` | `border-gray-200` → `border-2 border-slate-900`, `bg-blue-600` → `bg-[#f48c25]`, `retro-shadow` 추가 |
| C2 | ErrorBoundary 인라인 스타일 — 앱 테마 불일치 | `ErrorBoundary.tsx:26-40` | Tailwind 전환, EmptyState 패턴 참고, 다크모드 대응 |

#### High

| ID | 이슈 | 파일 | 개선 방향 |
|----|------|------|----------|
| H1 | TripFormPage 입력 필드 다크모드 미지원 | `TripFormPage.tsx:341+` | `dark:bg-[#2a1f15] dark:text-slate-100 dark:border-[#4a3f35]` 추가 |
| H2 | DashboardPage/ProfilePage 모던 미니멀 스타일 | 양 페이지 전체 | `shadow-md` → `border-[3px] border-slate-900 retro-shadow`, `rounded-3xl` → `rounded-xl` |
| H3 | TripDetailPage 공유 모달 입력 필드 다크모드 누락 | `TripDetailPage.tsx:650, 655, 698` | `dark:bg-[#1a1208]` 추가 |
| H4 | 경비/체크리스트/메모 편집 필드 다크모드 누락 | `TripDetailPage.tsx:827, 920, 1021+` | `dark:bg-[#1a1208] dark:text-slate-100` 추가 |
| H5 | SearchFilter 비활성 필터 버튼 다크모드 누락 | `SearchFilter.tsx:69` | `dark:bg-[#2a1f15] dark:text-slate-400 dark:border-[#4a3f35]` 추가 |

#### Medium

| ID | 이슈 | 파일 | 개선 방향 |
|----|------|------|----------|
| M1 | 모바일 경비 인라인 편집 레이아웃 오버플로우 | `TripDetailPage.tsx:1017-1051` | `flex-wrap` 또는 2행 레이아웃, 금액 `w-20` 축소 |
| M2 | 지도 범례 다크모드 미지원 | `HomePage.tsx:532` | `dark:bg-[#2a1f15]` 추가 |
| M3 | SearchFilter 카운트가 핀 개수인데 필터 대상은 여행 | `HomePage.tsx:428-434` | tripCounts를 여행 기준으로 변경 |
| M4 | SpaceTrips 행성 모바일 터치 타겟 부족 (최소 36px) | `SpaceTrips.tsx:64` | 모바일 최소 44px, 터치 시 툴팁 추가 |
| M5 | 타임라인 D-day 스크롤바 숨김 미적용 | `TimelinePage.tsx:215` | `no-scrollbar` 클래스 추가 |
| M6 | TripCard CTA 텍스트 모든 상태에서 "Log Data Recap" | `TripCard.tsx:77` | 상태별 분기 (Recap/Plan/Explore) |

#### Low

| ID | 이슈 | 파일 |
|----|------|------|
| L1 | 한영 혼용 UI (버튼 영어/안내문 한국어) | BottomNav, TripDetailPage, HomePage 등 |
| L2 | TimelinePage 내 StatusBadge와 공용 컴포넌트 중복 | `TimelinePage.tsx:23-35` vs `StatusBadge.tsx` |
| L3 | SpaceTrips @keyframes 정의 위치 불명확 | `index.css` 확인 필요 |
| L4 | TripCard 접근성 — 링크 `aria-label` 미사용 | `TripCard.tsx` |
| L5 | 모달 오프닝 애니메이션 불일치 | ConfirmModal(즉시) vs TripFormModal(슬라이드업) |
| L6 | SpaceTrips 컴포넌트가 HomePage에서 미사용 | 우주 메타포 핵심인데 메인 페이지 부재 |

---

## 5. Service Planner Report

**분석 범위**: 전체 기능 셋, 사용자 여정, 경쟁사 대비 포지셔닝

### 기능 완성도 매트릭스

```
 기능            완성도     평가
──────────────────────────────────────────────
 여행 CRUD      ████████▓░  95%  생성/수정/삭제/조회 완비
 공유 기능      █████████░  90%  이메일 초대, 읽기/편집 권한
 세계 지도      █████████░  90%  clustering, 필터, 범례
 다크 모드      █████████░  90%  전반적 잘 됨
 핀/장소 관리   ████████░░  85%  지오코딩, Day별 관리
 체크리스트     ████████░░  85%  인라인 CRUD, 진행률
 경비 관리      ████████░░  85%  7카테고리, 비율차트
 사진 업로드    ████████░░  80%  Cloudinary, 압축
 타임라인       ████████░░  80%  연도 그룹, D-day
 프로필         ███████░░░  75%  닉네임/소개, 통계 요약
 대시보드 통계  ███████░░░  75%  지출 분석, 방문 국가/도시
 환율 정보      ███████░░░  70%  Frankfurter API
 검색/필터      ███████░░░  70%  텍스트 + 상태필터
 온보딩         ███░░░░░░░  30%  EmptyState CTA 한 줄뿐
──────────────────────────────────────────────
```

### 사용자 여정 분석

```
                현재 여정
 ┌──────────────────────────────────────────────────┐
 │  로그인(Google/Kakao)                             │
 │      ↓                                           │
 │  홈페이지 (세계지도 + Quick Stats + 즐겨찾기)       │
 │      ↓                                           │
 │  "+" FAB → 여행 생성 모달                          │
 │      ↓                                           │
 │  여행 상세 → 인라인 편집                            │
 │  (일정/경비/사진/체크리스트/메모)                    │
 │      ↓                                           │
 │  ??? (리텐션 루프 부재)                            │
 └──────────────────────────────────────────────────┘

           ┌────────────────────────┐
  강점     │ 데모 모드 즉시 작동      │
           │ 샘플 데이터 5개 제공     │
           │ FAB 1탭으로 여행 생성   │
           │ 인라인 편집 우수         │
           └────────────────────────┘

           ┌────────────────────────┐
  약점     │ 온보딩 가이드 없음       │
           │ 핀/장소 관계 모호       │
           │ 상태 전환 마찰 높음     │
           │ 여행 라이프사이클 불명확  │
           │ 리텐션 루프 부재         │
           └────────────────────────┘
```

### 개선 제안 (MoSCoW)

#### Must Have

| ID | 제안 | 근거 |
|----|------|------|
| M1 | **온보딩 가이드** — 3~4단계 슬라이드 튜토리얼 | 사용자 55%+ 온보딩 없이 이탈 |
| M2 | **여행 상태 원클릭 전환** — 상세에서 "여행 완료!" 버튼 | 핵심 시나리오(여행 후 기록) 마찰 최소화 |
| M3 | **사진 캡션/메모** — 각 사진에 캡션, 날짜, 장소 태그 | 여행 기록의 핵심 = 추억의 맥락화 |
| M4 | **데이터 내보내기/백업** — JSON/PDF 다운로드 | 데모모드 사용자 브라우저 캐시 삭제 시 전체 유실 |

#### Should Have

| ID | 제안 | 근거 |
|----|------|------|
| S1 | **정렬 옵션** (최근수정/여행일/이름순/경비순) | 10개+ 여행 시 탐색 어려움 |
| S2 | **태그/카테고리** (#맛집투어 #힐링 #가족여행) | 여행 구분 메타데이터 부족 |
| S3 | **다중 통화 경비** (현지 통화 입력 + 원화 자동 변환) | 해외여행 현지 통화 입력이 자연스러움 |
| S4 | **여행 복제** (일정/장소/체크리스트 복사) | 같은 도시 재방문/친구 공유 시 활용 |
| S5 | **알림/리마인더** (D-day 출발 전, 체크리스트 미완료) | 계획 여행 사용자 리텐션 |

#### Could Have

| ID | 제안 | 근거 |
|----|------|------|
| C1 | SNS 공유/공개 프로필 (공개 URL, OG meta) | 바이럴 성장 동력 |
| C2 | 여행 템플릿 (인기 여행지별 추천 일정) | 신규 사용자 진입 장벽 제거 |
| C3 | AI 기반 여행 인사이트 (여행 스타일/선호 분석) | 리텐션 강화 |
| C4 | 오프라인 모드 강화 (Service Worker + IndexedDB) | 해외 여행 중 데이터 없이 사용 |

### 핵심 신규 기능 제안

| 우선순위 | 기능 | 상세 | 기대 효과 |
|---------|------|------|----------|
| **P1** | 여행 일기/저널 | Day별 마크다운 일기 + 사진 인라인 삽입 + 감정/날씨 태그 | "여행 관리"→"여행 기록" 전환의 핵심. 리텐션 최대 동력 |
| **P1** | 여행 사진 타임라인 | 날짜/장소별 자동 정리, EXIF 자동 추출, "Day 1: 시부야" 형태 | 사진의 맥락화, Google Photos 대비 차별점 |
| **P1** | 통계 고도화 | 월별 여행 히트맵, 총 이동거리, 여행 스타일 분석, 감성 통계 | 데이터 축적의 가치 극대화 |
| **P2** | 장소 리뷰/평점 | DB `rating` 컬럼 활용, 별점 + 한줄평 + 사진 | 구현 비용 낮음, 나만의 맛집/명소 DB |
| **P3** | 여행 지도 꾸미기 | 방문 국가 색칠 지도 이미지 내보내기, "세계 정복률" | 게이미피케이션 + SNS 공유 |

### 경쟁사 비교

```
               Anecdote    Polar-    TripIt   Wander-
               World       steps              log
 ─────────────────────────────────────────────────────
 자동 추적      ✗ (수동)    ✓ (GPS)   ✓ (이메일) 반자동
 지도 시각화    ✓ (우수)    ✓ (최우수) 기본      ✓
 경비 관리      ✓ (기본)    ✗         ✗         ✓ (우수)
 일정 관리      ✓ (Day별)   ✗         ✓ (일정표) ✓ (최우수)
 사진 관리      ✓ (기본)    ✓ (우수)   ✗         ✓
 공유/협업      ✓ (우수)    ✓         ✓         ✓
 한국어 특화    ✓           ✗         ✗         ✗
 무료           ✓ (데모)    프리미엄   프리미엄   프리미엄
 디자인 차별성   ★★★★★     ★★★★     ★★       ★★★
 오프라인       부분         ✓         ✓         ✓
 ─────────────────────────────────────────────────────
```

### 포지셔닝 전략

```
 ┌─────────────────────────────────────────────┐
 │  "여행을 기록하는 가장 아름다운 방법"          │
 │                                             │
 │  타깃: 20-30대 한국인 여행 애호가             │
 │  가치: 우주 행성 시각화 + 세계 정복 성취감     │
 │                                             │
 │  Phase 1: 핵심 기록 강화 (일기/사진 캡션)     │
 │  Phase 2: 소셜 확대 (공개 프로필, SNS 카드)   │
 │  Phase 3: 커뮤니티 (템플릿, 리뷰 공유)        │
 └─────────────────────────────────────────────┘

 리텐션 전략:
 ┌─────────────────────────────────────────────┐
 │  ✦ 월별/연간 여행 회고 리포트                 │
 │  ✦ "1년 전 오늘, 도쿄에 있었습니다" 추억 알림  │
 │  ✦ 여행 목표 설정 + 달성률 트래킹             │
 │  ✦ SpaceTrips 행성이 여행 추가할수록 화려해짐  │
 └─────────────────────────────────────────────┘
```

---

## Priority Roadmap

### Phase 1: 즉시 (보안 + Critical 버그)

```
 ⚡ 예상 작업량: 1-2일
 ─────────────────────────────────────────────
 □ SEC-1  useTrip SELECT에 user_id 필터 추가
 □ SEC-3  WorldMap 팝업 HTML 이스케이프 처리
 □ SEC-4  Edge Function 이메일 HTML 이스케이프
 □ BUG-1  FitBounds에 useEffect 적용
 □ BUG-2  formatDate 빈 문자열 처리
 □ BUG-3  404 라우트 추가
 □ BUG-5  커버 이미지 빈 문자열 fallback 처리
```

### Phase 2: 단기 (안정성 + UX 일관성)

```
 ⚡ 예상 작업량: 3-5일
 ─────────────────────────────────────────────
 □ H-BE-1  delete-then-insert → upsert 패턴
 □ H-UX-1  PinFormPage 네오브루탈 스타일 적용
 □ H-UX-2  DashboardPage/ProfilePage 스타일 통일
 □ H-UX-3  다크모드 입력 필드 일관성 수정
 □ H-FE-4  검색 디바운싱 적용
 □ H-FE-5  pinFilters useMemo 적용
 □ BUG-6   렌더 본문 setState → useEffect
 □ BUG-7   비동기 fetch cancelled 플래그 추가
```

### Phase 3: 중기 (기능 + 접근성)

```
 ⚡ 예상 작업량: 1-2주
 ─────────────────────────────────────────────
 □ ARCH-1  접근성 aria/role/포커스 트래핑 추가
 □ ARCH-2  TripDetailPage 섹션별 컴포넌트 분리
 □ M1      온보딩 가이드 도입
 □ M2      여행 상태 원클릭 전환
 □ M3      사진 캡션/메모 기능
 □ S1      정렬 옵션 추가
 □ S2      태그/카테고리 시스템
```

### Phase 4: 장기 (성장)

```
 ⚡ 예상 작업량: 2-4주
 ─────────────────────────────────────────────
 □ P1-1    여행 일기/저널 기능
 □ P1-2    여행 사진 타임라인
 □ P1-3    통계 고도화
 □ C1      SNS 공유/공개 프로필
 □ C4      오프라인 모드 강화
```
