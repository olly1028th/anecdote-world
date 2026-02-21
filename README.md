# Anecdote World

> *Life is short and the world is wide.*

나만의 여행 기록을 지도 위에 남기고, 다음 여행을 계획하는 개인 여행 트래커 웹앱입니다.

## Screenshots

| 홈 (리스트 뷰) | 홈 (지도 뷰) | 여행 상세 |
|---|---|---|
| 여행 카드 그리드 + 필터링 | Leaflet 인터랙티브 월드맵 | 타임라인 · 경비 · 체크리스트 |

## Features

- **여행 CRUD** — 완료된 여행 기록 및 계획 중인 여행 관리
- **인터랙티브 지도** — Leaflet + OpenStreetMap 기반 핀 시각화 (방문/계획/위시리스트 색상 구분)
- **핀 관리** — 장소별 좌표, 카테고리, 별점, 메모, 사진 관리
- **경비 추적** — 항공, 숙박, 식비, 교통 등 7개 카테고리별 비용 기록
- **여행 타임라인** — 일자별 일정 표시
- **준비 체크리스트** — 계획 중인 여행의 준비 사항 관리 및 진행률 표시
- **추천 장소** — must / want / maybe 우선순위 태그
- **OAuth 인증** — Google · Kakao 소셜 로그인 (Supabase Auth)
- **데모 모드** — Supabase 설정 없이도 샘플 데이터로 전체 기능 체험 가능

## Tech Stack

| 분류 | 기술 |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL) |
| Maps | Leaflet + react-leaflet |
| Auth | Supabase Auth (Google, Kakao OAuth) |
| Routing | React Router DOM 7 |

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
│   ├── ProtectedRoute.tsx
│   └── Map/
│       ├── WorldMap.tsx
│       └── PinMarker.tsx
├── pages/             # 페이지 컴포넌트
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── TripDetailPage.tsx
│   ├── TripFormPage.tsx
│   └── PinFormPage.tsx
├── contexts/          # React Context
│   └── AuthContext.tsx
├── hooks/             # 커스텀 훅
│   ├── useTrips.ts
│   └── usePins.ts
├── types/             # TypeScript 타입 정의
├── utils/             # 유틸리티 (포맷팅, 샘플 데이터)
├── lib/               # Supabase 클라이언트
├── App.tsx
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

> 환경 변수 없이도 **데모 모드**로 앱을 사용할 수 있습니다.

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

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

## License

MIT
