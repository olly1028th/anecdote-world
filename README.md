# Anecdote World

> *Life is short and the world is wide.*

나만의 여행 기록을 지도 위에 남기고, 다음 여행을 계획하는 개인 여행 트래커 웹앱입니다.

**Live Demo:** [https://anecdote-world.vercel.app](https://anecdote-world.vercel.app)

## Features

- **여행 CRUD** — 완료된 여행 기록(정복 완료) 및 계획 중인 여행(정복 예정) 관리 (추가/수정/삭제)
- **인터랙티브 지도** — Leaflet + OpenStreetMap 기반 핀 시각화, 행성 아이콘 마커 (방문/계획/위시리스트 색상 구분)
- **핀 관리** — 지도 클릭으로 장소 등록, 카테고리·별점·메모 관리, 여행 연결
- **인라인 편집** — 상세 페이지에서 항목별(사진, 경비, 체크리스트, 장소, 메모) 카드를 클릭하여 바로 편집
- **사진 갤러리** — URL/파일 업로드, 라이트박스 뷰어 (이전/다음 네비게이션), 대표 이미지 설정, 인라인 사진 편집
- **경비 추적** — 항공, 숙박, 식비, 교통 등 7개 카테고리별 비용 기록 (인라인 추가/삭제)
- **여행 타임라인** — 일자별 일정 표시
- **준비 체크리스트** — 여행 준비 사항 관리 및 진행률 표시 (인라인 추가/삭제/토글)
- **추천 장소** — must / want / maybe 우선순위 태그 (인라인 추가/삭제)
- **여행 공유** — 이메일로 다른 유저 초대, 수락/거절, read/edit 권한 관리
- **Favorite Moments** — 정복 완료된 여행만 카드로 표시
- **OAuth 인증** — Google · Kakao 소셜 로그인 (Supabase Auth)
- **데모 모드** — Supabase 설정 없이도 샘플 데이터로 전체 기능 체험 가능 (localStorage 기반 CRUD 완전 지원)
- **에러 바운더리** — 런타임 에러 시 흰 화면 대신 에러 메시지 표시

## Tech Stack

| 분류 | 기술 |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL) |
| Maps | Leaflet + react-leaflet |
| Auth | Supabase Auth (Google, Kakao OAuth) |
| Routing | React Router 7 |
| Deploy | Vercel |

## Project Structure

```
src/
├── components/        # 재사용 UI 컴포넌트
│   ├── Header.tsx
│   ├── TripCard.tsx
│   ├── StatusBadge.tsx
│   ├── ExpenseTable.tsx
│   ├── Timeline.tsx
│   ├── PlaceList.tsx
│   ├── Checklist.tsx
│   ├── PhotoGallery.tsx      # 사진 그리드 + 라이트박스
│   ├── PhotoUpload.tsx       # 사진 업로드 (URL/파일)
│   ├── ErrorBoundary.tsx     # 런타임 에러 캐치
│   ├── ProtectedRoute.tsx
│   └── Map/
│       ├── WorldMap.tsx      # Leaflet 월드맵 (lazy loaded)
│       └── PinMarker.tsx     # 상태별 색상 마커
├── pages/             # 페이지 컴포넌트
│   ├── HomePage.tsx          # 리스트 뷰 + 지도 뷰 전환
│   ├── LoginPage.tsx         # 소셜 로그인
│   ├── TripDetailPage.tsx    # 여행 상세 (갤러리, 타임라인, 경비)
│   ├── TripFormPage.tsx      # 여행 추가/수정 폼
│   └── PinFormPage.tsx       # 핀 추가/수정 폼 (lazy loaded)
├── contexts/          # React Context
│   └── AuthContext.tsx       # 인증 상태 + 데모 모드
├── hooks/             # 커스텀 훅
│   ├── useTrips.ts           # 여행 CRUD + Supabase 연동
│   ├── usePins.ts            # 핀 CRUD + Supabase 연동
│   └── useShares.ts          # 여행 공유/초대 CRUD
├── types/             # TypeScript 타입 정의
│   ├── trip.ts               # UI 모델
│   └── database.ts           # DB 스키마 (Supabase)
├── utils/             # 유틸리티
│   ├── format.ts             # 날짜, 통화 포맷팅
│   └── sampleData.ts         # 데모 모드 샘플 데이터
├── lib/
│   └── supabase.ts           # Supabase 클라이언트
├── App.tsx                   # 라우팅 (Layout Route 패턴)
├── main.tsx
└── index.css
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/olly1028th/anecdote-world.git
cd anecdote-world
npm install
```

### Environment Variables

`.env.example`을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> 환경 변수 없이도 **데모 모드**로 앱을 사용할 수 있습니다. 샘플 여행 데이터와 핀이 자동으로 표시됩니다.

### Development

```bash
npm run dev
```

### Build & Preview

```bash
npm run build
npm run preview
```

## Development Progress

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 프로젝트 셋업, 기본 UI (TripCard, 홈페이지, 상세페이지) | Done |
| Phase 2 | Supabase 인증 (Google/Kakao OAuth), DB 연동, 데모 모드 | Done |
| Phase 3 | 세계지도 + 핀 시스템 (Leaflet, 마커, 핀 CRUD 폼) | Done |
| Phase 4 | 여행/핀 CRUD 폼, 사진 갤러리, 라이트박스, 대표 이미지 | Done |
| Phase 5 | 상세 페이지 인라인 편집, 데모 모드 데이터 영속성, 사진 인라인 편집 | Done |
| Phase 6 | 여행 공유 기능 (초대/수락/거절, read/edit 권한) | Done |
| Phase 7 | UI/UX 개선 (정복 완료/예정 라벨, 행성 마커, Favorite Moments) | Done |
| Phase 8 | 위시리스트 상태 추가, 데모 모드 저장 버그 수정, 이미지 압축 | Done |

## Database Schema

Supabase (PostgreSQL) 테이블 구성:

| 테이블 | 설명 |
|---|---|
| `profiles` | 사용자 프로필 (닉네임, 아바타, 소개) |
| `trips` | 여행 기록 (상태, 날짜, 커버 이미지, 메모) |
| `pins` | 장소 핀 (좌표, 카테고리, 별점, 방문 상태) |
| `pin_photos` | 핀 관련 사진 |
| `expenses` | 경비 내역 (카테고리, 금액) |
| `checklist_items` | 준비 체크리스트 |
| `trip_shares` | 여행 공유/초대 (권한: read/edit, 상태: pending/accepted/declined) |

자세한 스키마는 [docs/DATABASE.md](docs/DATABASE.md) 및 [docs/schema.sql](docs/schema.sql)을 참고하세요.

## Recent Changes

### Phase 8 — 위시리스트 & 버그 수정
- 여행 상태에 '위시' (wishlist) 옵션 추가
- 홈페이지 Quick Stats에 위시리스트 카운트 및 목록 패널 추가
- 데모 모드 저장 실패 수정 (`isDemo` 플래그로 데이터 소스 판별)
- 사진 업로드 시 이미지 압축 (800px/JPEG 70%) 적용

### Phase 7 — UI/UX 개선
- 'Planned' → '정복 예정', 'Completed' → '정복 완료' 라벨 변경
- 지도 마커를 행성 아이콘으로 변경 (방문 상태별 색상 유지)
- Favorite Moments 섹션에 정복 완료된 여행만 표시
- 모달 z-index 오버랩 수정 (지도 필터 위에 모달 표시)
- 상세 페이지 네비게이션 오류 수정 (데모 데이터 폴백)

### Phase 6 — 여행 공유 기능
- 이메일 기반 초대 시스템 (read/edit 권한 선택)
- 초대받은 유저의 수락/거절 플로우
- 홈페이지에 대기 중인 초대 알림 표시
- 공유된 여행에 대한 권한별 접근 제어
- `trip_shares` 테이블 및 RLS 정책 추가

### Phase 5 — 인라인 편집 및 데모 모드 개선
- 상세 페이지 항목별 인라인 편집 (경비, 체크리스트, 장소, 메모, 사진)
- 스탯 카드 클릭 시 해당 섹션 편집 모드 진입
- 빈 섹션에 "탭하여 추가" 플레이스홀더 표시
- 데모 모드 데이터 영속성 수정 (체크리스트 토글, 여행 삭제 등)
- 인라인 사진 업로드/편집 지원

## Deploy

Vercel에 연결하면 `main` 브랜치 push 시 자동 배포됩니다.

Vercel 환경변수 설정:
- `VITE_SUPABASE_URL` — Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public 키

## License

MIT
