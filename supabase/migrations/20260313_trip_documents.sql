-- ============================================================
-- trip_documents 테이블 + Storage 버킷 설정
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- 1. 테이블 생성
CREATE TABLE trip_documents (
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

-- 3. RLS 정책: 본인 데이터 CRUD
CREATE POLICY "Users can select own documents"
  ON trip_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON trip_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON trip_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON trip_documents FOR DELETE
  USING (auth.uid() = user_id);

-- 4. 공유받은 여행의 서류 읽기 접근
CREATE POLICY "Shared trip document access"
  ON trip_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.trip_id = trip_documents.trip_id
        AND trip_shares.status = 'accepted'
        AND (
          trip_shares.invited_user_id = auth.uid()
          OR trip_shares.invited_email = auth.email()
        )
    )
  );

-- 5. Storage 버킷 생성 (공개, 10MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('trip-documents', 'trip-documents', true, 10485760);

-- 6. Storage RLS 정책
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-documents');

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
