-- 004: trips 테이블에 traveler_count 컬럼 추가
-- 여행 인원 수 (기본값 1, PC/모바일 간 동기화용)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS traveler_count INTEGER NOT NULL DEFAULT 1;
