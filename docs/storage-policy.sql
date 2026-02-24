-- ============================================================
-- Anecdote World - Storage Bucket RLS 정책
-- ============================================================
-- 사용법:
--   1. Supabase 대시보드 > Storage > New Bucket
--      - Name: trip-photos
--      - Public bucket: ON
--   2. SQL Editor에서 아래 SQL을 하나씩 실행
-- ============================================================

-- 1) 누구나 사진 조회 가능 (public bucket)
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'trip-photos' );

-- 2) 로그인한 유저만 업로드 가능
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'trip-photos' );

-- 3) 본인이 업로드한 사진만 삭제 가능
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (select auth.uid())::text = (string_to_array(name, '/'))[1]
);
