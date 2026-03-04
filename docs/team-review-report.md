# Anecdote World — 5인 전문가 팀 종합 검토 보고서

> 검토일: 2026-03-04
> 대상 버전: `66bcbae` (claude/review-project-structure-3rmKA)

## 팀 구성 및 검토 범위

| # | 역할 | 검토 대상 | 발견 사항 |
|---|------|----------|----------|
| 1 | **프론트엔드 아키텍트** | 컴포넌트 구조, React 패턴, 코드 스플리팅 | 🔴5 🟡11 🟢10 |
| 2 | **백엔드/데이터 엔지니어** | Supabase, 데이터 흐름, 보안, 일관성 | 🔴4 🟡12 🟢7 |
| 3 | **UI/UX & 접근성 전문가** | 디자인 시스템, a11y, 반응형, 다크모드 | 🔴7 🟡13 🟢10 |
| 4 | **보안 & 성능 전문가** | XSS, 인증, CSP, 번들, API 보안 | 🔴4 🟡11 🟢3 |
| 5 | **DevOps/DX 엔지니어** | 빌드, 테스트, CI/CD, 코드 품질 | 🔴5 🟡18 🟢12 |

---

## 🔴 Critical — 즉시 수정 필요

### 1. 보안 헤더 완전 누락 (CSP, X-Frame-Options 등)

- **파일**: `vercel.json`, `index.html`
- `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` 헤더 없음
- XSS 발생 시 방어막 0

### 2. `<html lang="en">` — 한국어 앱에 영어 lang 설정

- **파일**: `index.html:2`
- 스크린 리더가 한국어를 잘못 발음 (WCAG 3.1.1 위반)
- **수정**: `<html lang="ko">`

### 3. 접근성(a11y) 전면 부재

- **전체 코드베이스**: `aria-*` 속성 **0건**, `role` 속성 **0건**
- 모달: `role="dialog"`, `aria-modal`, 포커스 트랩 없음
- Toast: `role="alert"`, `aria-live` 없음
- 폼: `<label htmlFor>` + `<input id>` 연결 없음
- SVG 아이콘: `aria-hidden` 없음
- 키보드 접근 불가한 인터랙티브 `<div>` 다수

### 4. CI/CD 파이프라인 & 테스트 완전 부재

- `.github/workflows/` 없음, `test` 스크립트 없음
- 테스트 파일 **0개**
- 타입 에러/린트 위반이 프로덕션 배포 가능

### 5. 데이터 보안 — user_id 필터 누락 지점

- **`useTrips.ts:204-215`**: 공유 여행의 `expenses`, `checklist_items`, `pins` 조회에 `user_id` 필터 없음
- **`useShares.ts:58-62`**: `useSharesForTrip`에서 소유자 검증 없이 공유 목록 전체 노출
- **`useShares.ts:717`**: `revokeAllShares`에서 서버 측 인증 없음
- RLS 미적용 시 타 계정 데이터 노출 위험

### 6. 임의 URL 입력을 검증 없이 이미지 소스로 사용

- **`PhotoUpload.tsx:118`**: `javascript:`, `data:` 프로토콜 차단 없음
- **Edge Function CORS**: `Access-Control-Allow-Origin: *` (스팸 악용 가능)

### 7. God Component — TripDetailPage.tsx (1,285줄)

- 사진/경비/체크리스트/장소/메모 편집 + 공유 모달 + 확인 다이얼로그 전부 한 파일
- 동시에 10개 이상의 `useState` 선언

---

## 🟡 주요 개선 권장사항

### 아키텍처 & 코드 품질

| # | 문제 | 파일 | 설명 |
|---|------|------|------|
| 1 | `useStats()` 중복 fetch | `useStats.ts:50-51` | 내부에서 `useTrips()+usePins()` 호출, 인스턴스 공유 안 됨 |
| 2 | mutation마다 `auth.getUser()` 재호출 | `useTrips.ts` 7곳 | 호출자가 이미 user를 가지고 있음에도 매번 네트워크 요청 |
| 3 | `photo_captions` 타입 미정의 | `useTrips.ts:95` | `as unknown as Record<string, unknown>` 이중 캐스팅 우회 |
| 4 | `'demo-user-001'` 하드코딩 | 7개 파일 10회+ | `AuthContext`에 상수 있으나 미사용 |
| 5 | `tripStatus→pinStatus` 변환 7회 반복 | 3개 파일 | 헬퍼 함수 추출 필요 |
| 6 | `EXPENSE_CATEGORIES` 2곳 중복 | `TripFormPage`, `TripDetailPage` | 상수 파일로 추출 |
| 7 | 지오코딩 로직 3곳 산재 | `TripFormPage`, `PlaceSearchModal`, `DestinationPicker` | `lib/geocoding.ts`로 통합 |
| 8 | 공유 모달 코드 2곳 중복 | `HomePage`, `TripDetailPage` | `ShareModal` 컴포넌트 추출 |
| 9 | `ConfirmModal` state 타입 3곳 복붙 | 3개 페이지 | `useConfirmModal()` 훅 추출 |
| 10 | N+1 업데이트 루프 | `useTrips.ts:407-415` | `upsert`로 대체 가능 |

### 성능

| # | 문제 | 파일 | 설명 |
|---|------|------|------|
| 1 | `trip_shares` 테이블 3회+ 중복 쿼리 | `HomePage` + `Header` | 같은 데이터를 독립적으로 fetch |
| 2 | `completedTrips` 등 `useMemo` 미적용 | `HomePage.tsx:122-124` | 모든 렌더마다 trips 배열 3번 순회 |
| 3 | `ClusterLayer` 매 렌더 전체 재생성 | `WorldMap.tsx:52-129` | pins 참조 변경 시 마커 전체 재생성 |
| 4 | array index를 `key`로 사용 | 5개 컴포넌트 | 편집 모드에서 DOM 재사용 오류 가능 |
| 5 | 외부 API에 타임아웃 없음 | Photon, Nominatim, Frankfurter | `AbortController` 미사용 |
| 6 | Vite 청크 분리 전략 없음 | `vite.config.ts` | `manualChunks` 미설정 |

### UI/UX

| # | 문제 | 파일 | 설명 |
|---|------|------|------|
| 1 | 다크모드 `!important` 남용 (~40줄) | `index.css:82-145` | Tailwind `dark:` prefix와 혼용 |
| 2 | `text-[10px]` 130회, `text-[8px]` 다수 | 22개 파일 | WCAG 1.4.4 최소 텍스트 크기 위반 가능 |
| 3 | `prefers-reduced-motion` 미처리 | 전체 | 모션 민감 사용자 고려 없음 |
| 4 | 색상만으로 상태 구분 | 지도 핀 | 색맹 사용자 구분 불가 |
| 5 | `ErrorBoundary` 디자인 시스템 이탈 | `ErrorBoundary.tsx` | 인라인 style만 사용, 다크모드 미지원 |
| 6 | 저장 버튼 hover 색상 버그 | `TripFormModal.tsx:331` | 오렌지→레드 변경 (의도하지 않은 혼란) |

### 데이터 일관성

| # | 문제 | 파일 | 설명 |
|---|------|------|------|
| 1 | 여행 삭제 후 로컬 정리 누락 | `useTrips.ts:346-352` | Supabase 삭제 후 `deleteLocalTrip` 미호출 → 부활 가능 |
| 2 | `deletedIds` Set 무한 성장 | `localStore.ts` | 정리 로직 없음 |
| 3 | `allPinPhotos` 미필터링 전달 | `useTrips.ts:240` | 모든 여행의 전체 pin_photos를 함수에 전달 |
| 4 | 이메일 형식 검증 없음 | `useShares.ts:370` | 임의 문자열이 DB에 저장 가능 |

---

## 🟢 잘 된 점 (유지할 패턴)

| # | 패턴 | 파일 |
|---|------|------|
| 1 | Race condition 방지 (`fetchIdRef` + `mountedRef`) | `useTrips.ts`, `usePins.ts` |
| 2 | `Promise.all` 병렬 쿼리로 N+1 방지 | `useTrips.ts:204` |
| 3 | `visibilitychange` + 30초 쓰로틀 자동 refetch | `useTrips.ts`, `usePins.ts` |
| 4 | Tombstone 삭제 패턴 (trips + pins) | `localStore.ts` |
| 5 | XSS 방지 `escapeHtml` (Leaflet 팝업) | `WorldMap.tsx:12-20` |
| 6 | 코드 스플리팅 — 7개 페이지 + WorldMap lazy load | `App.tsx` |
| 7 | TypeScript strict + `import type` 일관 사용 | `tsconfig.app.json` |
| 8 | mutation에 user_id 이중 필터 | `useTrips.ts` |
| 9 | 모바일 퍼스트 반응형 — 바텀시트↔중앙모달 전환 | `TripFormModal.tsx` |
| 10 | Safe Area Inset 지원 | 모달, `BottomNav` |
| 11 | 이미지 점진적 압축 (2MB 보장) | `PhotoUpload.tsx` |
| 12 | Supabase 실패 시 데모 모드 자동 전환 | `useTrips.ts:256` |

---

## 우선순위 액션 플랜

| 순위 | 작업 | 난이도 | 영향도 |
|------|------|--------|--------|
| **P0** | `<html lang="ko">` 수정 | 1분 | 접근성 |
| **P0** | `vercel.json`에 보안 헤더 추가 (CSP 등) | 30분 | 보안 |
| **P0** | Edge Function CORS 와일드카드 제거 | 5분 | 보안 |
| **P1** | 모든 모달에 `role="dialog"` + 포커스 트랩 추가 | 2시간 | 접근성 |
| **P1** | Toast에 `role="alert" aria-live` 추가 | 15분 | 접근성 |
| **P1** | CI workflow 추가 (tsc + eslint + build) | 1시간 | DX |
| **P1** | `useSharesForTrip`에 소유자 검증 추가 | 15분 | 보안 |
| **P1** | URL 입력 검증 (`https://` 제한) | 15분 | 보안 |
| **P2** | Vitest + 핵심 유틸 단위 테스트 | 반나절 | DX |
| **P2** | `TripDetailPage` 서브 컴포넌트 분리 | 반나절 | 유지보수성 |
| **P2** | `'demo-user-001'` 상수화 | 30분 | DX |
| **P2** | 이메일 형식 검증 추가 | 15분 | 데이터 무결성 |
| **P3** | 다크모드 `!important` → Tailwind `dark:` 마이그레이션 | 반나절 | UI 일관성 |
| **P3** | 중복 코드 추출 (상수, 헬퍼, 컴포넌트) | 반나절 | DX |
| **P3** | Vite 청크 분리 + Prettier 설정 | 1시간 | 성능/DX |
