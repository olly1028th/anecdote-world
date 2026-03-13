import { supabase } from './supabase';

const BUCKET = 'trip-photos';
const DOC_BUCKET = 'trip-documents';

/**
 * base64 data URL → Blob 변환
 * (파일 선택 시 base64로 미리보기 → 저장 시 Blob으로 업로드)
 */
function base64ToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * 사진 1장을 Supabase Storage에 업로드하고 공개 URL을 반환.
 * base64 data URL 또는 File 객체 모두 지원.
 */
export async function uploadTripPhoto(
  tripId: string,
  photo: string | File,
): Promise<string> {
  // 로그인 유저 확인 (Storage 경로에 user_id 포함)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  let blob: Blob;
  let ext = 'jpg';

  if (typeof photo === 'string') {
    if (photo.startsWith('data:')) {
      // base64 data URL → Blob
      blob = base64ToBlob(photo);
      const mime = blob.type.split('/')[1] || 'jpg';
      ext = mime === 'jpeg' ? 'jpg' : mime;
    } else {
      // HTTP(S) URL → fetch → Blob (Cloudinary 등 외부 이미지)
      const response = await fetch(photo);
      if (!response.ok) throw new Error(`이미지 다운로드 실패 (${response.status})`);
      blob = await response.blob();
      const mime = blob.type.split('/')[1] || 'jpg';
      ext = mime === 'jpeg' ? 'jpg' : mime;
    }
  } else {
    blob = photo;
    ext = photo.name.split('.').pop() || 'jpg';
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${user.id}/${tripId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 여행에 연결된 모든 사진 URL을 Storage에서 조회.
 */
export async function listTripPhotos(tripId: string): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const folderPath = `${user.id}/${tripId}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folderPath, { sortBy: { column: 'created_at', order: 'asc' } });

  if (error || !data) return [];

  return data
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map((f) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${folderPath}/${f.name}`);
      return urlData.publicUrl;
    });
}

/**
 * Storage에서 사진 삭제.
 */
export async function deleteTripPhoto(
  tripId: string,
  url: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  const path = `${user.id}/${tripId}/${fileName}`;
  await supabase.storage.from(BUCKET).remove([path]);
}

// ============================================================
// 예약 서류 (Documents) Storage 함수
// ============================================================

/**
 * 예약 서류 파일을 Supabase Storage에 업로드하고 Storage 경로를 반환.
 */
export async function uploadTripDocument(
  tripId: string,
  file: File,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const ext = file.name.split('.').pop() || 'pdf';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${user.id}/${tripId}/${fileName}`;

  const { error } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  // Storage 경로를 반환
  return `supabase-doc://${path}`;
}

/**
 * Storage 경로에서 파일을 다운로드하여 blob URL을 반환.
 * - supabase-doc:// 경로 → download → blob URL
 * - 기존 Supabase public URL → Storage 경로 추출 → download → blob URL
 * - 일반 URL / data URL → 그대로 반환
 */
export async function getDocumentBlobUrl(url: string): Promise<string> {
  let path: string | null = null;

  if (url.startsWith('supabase-doc://')) {
    path = url.replace('supabase-doc://', '');
  } else if (url.includes(`/storage/v1/object/public/${DOC_BUCKET}/`)) {
    // 기존 public URL에서 Storage 경로 추출
    path = url.split(`/storage/v1/object/public/${DOC_BUCKET}/`)[1];
  }

  if (!path) return url;

  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .download(path);

  if (error || !data) throw error || new Error('파일 다운로드 실패');
  return URL.createObjectURL(data);
}

/**
 * Storage에서 예약 서류 삭제.
 */
export async function deleteTripDocument(
  tripId: string,
  url: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  let path: string;
  if (url.startsWith('supabase-doc://')) {
    path = url.replace('supabase-doc://', '');
  } else {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    path = `${user.id}/${tripId}/${fileName}`;
  }
  await supabase.storage.from(DOC_BUCKET).remove([path]);
}
