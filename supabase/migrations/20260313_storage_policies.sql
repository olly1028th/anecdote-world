-- ============================================================
-- trip-documents Storage 버킷 + RLS 정책 (수정용)
-- 이미 버킷이 있어도 public으로 업데이트됩니다.
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- 버킷: 생성 또는 public 업데이트
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('trip-documents', 'trip-documents', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 기존 정책 삭제 후 재생성 (충돌 방지)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-documents');

DROP POLICY IF EXISTS "Users can delete own trip-documents" ON storage.objects;
CREATE POLICY "Users can delete own trip-documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
