-- ============================================================
-- trip-documents Storage 버킷 RLS 정책
-- 테이블과 버킷은 이미 생성된 상태에서 이 파일만 실행
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- 파일 업로드 권한 (본인 폴더에만)
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 파일 읽기 권한 (공개)
CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-documents');

-- 파일 삭제 권한 (본인 파일만)
CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
