/**
 * Cloudinary 무료 저장소 연동 (Unsigned Upload)
 *
 * 설정 방법:
 * 1. https://cloudinary.com 에서 무료 계정 생성
 * 2. Settings → Upload → Upload presets에서 Unsigned preset 생성
 * 3. .env 파일에 VITE_CLOUDINARY_CLOUD_NAME과 VITE_CLOUDINARY_UPLOAD_PRESET 설정
 *
 * 무료 플랜: 25GB 저장 / 25GB 대역폭 / 월 25,000회 변환
 * 서버 없이 브라우저에서 직접 업로드 가능 (unsigned upload)
 */

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '';

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

/**
 * Blob/File을 Cloudinary에 직접 업로드하고 최적화된 URL을 반환.
 * 서버가 필요 없는 unsigned upload 방식 사용.
 */
export async function uploadToCloudinary(blob: Blob): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Cloudinary가 설정되지 않았습니다. .env 파일에 VITE_CLOUDINARY_CLOUD_NAME과 VITE_CLOUDINARY_UPLOAD_PRESET을 설정해주세요.',
    );
  }

  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'anecdote-world');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`업로드 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Cloudinary 자동 최적화 URL 반환 (f_auto: 최적 포맷, q_auto: 자동 품질)
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

/**
 * Cloudinary URL에서 public_id를 추출.
 * 삭제 시 사용 (unsigned upload에서는 클라이언트 삭제 불가, 참고용).
 */
export function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match?.[1] ?? null;
}
