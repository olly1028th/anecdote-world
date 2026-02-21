import { supabase } from './supabase';

const BUCKET = 'trip-photos';

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
  let blob: Blob;
  let ext = 'jpg';

  if (typeof photo === 'string') {
    // base64 data URL → Blob
    blob = base64ToBlob(photo);
    const mime = blob.type.split('/')[1] || 'jpg';
    ext = mime === 'jpeg' ? 'jpg' : mime;
  } else {
    blob = photo;
    ext = photo.name.split('.').pop() || 'jpg';
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${tripId}/${fileName}`;

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
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(tripId, { sortBy: { column: 'created_at', order: 'asc' } });

  if (error || !data) return [];

  return data
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map((f) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${tripId}/${f.name}`);
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
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  const path = `${tripId}/${fileName}`;
  await supabase.storage.from(BUCKET).remove([path]);
}
