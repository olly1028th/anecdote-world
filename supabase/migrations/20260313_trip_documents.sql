-- ============================================================
-- trip_documents 테이블 + Storage 버킷 설정
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- 1. 테이블 생성 (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS trip_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS 활성화
ALTER TABLE trip_documents ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책: 본인 데이터 CRUD (이미 있으면 건너뜀)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_documents' AND policyname = 'Users can select own documents') THEN
    CREATE POLICY "Users can select own documents" ON trip_documents FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_documents' AND policyname = 'Users can insert own documents') THEN
    CREATE POLICY "Users can insert own documents" ON trip_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_documents' AND policyname = 'Users can update own documents') THEN
    CREATE POLICY "Users can update own documents" ON trip_documents FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_documents' AND policyname = 'Users can delete own documents') THEN
    CREATE POLICY "Users can delete own documents" ON trip_documents FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_documents' AND policyname = 'Shared trip document access') THEN
    CREATE POLICY "Shared trip document access" ON trip_documents FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM trip_shares
        WHERE trip_shares.trip_id = trip_documents.trip_id
          AND trip_shares.status = 'accepted'
          AND (trip_shares.invited_user_id = auth.uid() OR trip_shares.invited_email = auth.email())
      )
    );
  END IF;
END $$;

-- 4. Storage 버킷: 생성 또는 public 업데이트
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('trip-documents', 'trip-documents', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage RLS 정책 (기존 정책 삭제 후 재생성)
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
