-- ============================================================
-- Anecdote World - Storage Bucket RLS 정책
-- ============================================================
-- 사용법:
--   1. Supabase 대시보드 > Storage > New Bucket
--      - Name: trip-photos
--      - Public bucket: ON
--   2. SQL Editor에서 아래 SQL 실행
--
-- 파일 경로 구조: {user_id}/{trip_id}/{filename}
-- ============================================================

-- 누구나 사진 조회 가능 (public bucket, 공유 여행 사진 열람 지원)
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'trip-photos' );

-- 로그인한 유저만 본인 폴더에 업로드 가능
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos'
  AND (select auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- 본인 폴더의 사진만 수정 가능
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (select auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- 본인 폴더의 사진만 삭제 가능
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (select auth.uid())::text = (string_to_array(name, '/'))[1]
);
