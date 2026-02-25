import { useState, useRef } from 'react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { useToast } from '../contexts/ToastContext';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  coverImage: string;
  onCoverChange: (url: string) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * 이미지를 2MB 이하로 점진적 압축.
 * maxWidth를 줄이고 quality를 낮추면서 목표 크기 이하가 될 때까지 반복.
 */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 이미 2MB 이하인 JPEG/WebP는 그대로 반환
    if (file.size <= MAX_BYTES && /^image\/(jpeg|webp)$/.test(file.type)) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // 점진적 압축: (maxWidth, quality) 조합을 시도
      const attempts: [number, number][] = [
        [1920, 0.8], [1280, 0.7], [1024, 0.6],
        [800, 0.5], [640, 0.4], [480, 0.3],
      ];

      for (const [maxW, q] of attempts) {
        let { width, height } = img;
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // toBlob은 비동기이므로 toDataURL로 크기 확인 후 최적 단계에서 toBlob
        const dataUrl = canvas.toDataURL('image/jpeg', q);
        // base64 문자열 길이 × 0.75 ≈ 실제 바이트 크기
        const estimatedSize = (dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75;

        if (estimatedSize <= MAX_BYTES) {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('압축 실패'))),
            'image/jpeg',
            q,
          );
          return;
        }
      }

      // 모든 시도 후에도 초과 시 최저 설정으로 반환
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('압축 실패'))),
        'image/jpeg',
        0.2,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = url;
  });
}

/** Blob → base64 data URL (데모 모드용) */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(blob);
  });
}

/** localStorage 남은 용량 추정 (bytes) */
function estimateLocalStorageRemaining(): number {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) used += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
    return Math.max(0, 5 * 1024 * 1024 - used * 2);
  } catch {
    return 0;
  }
}

export default function PhotoUpload({ photos, onChange, coverImage, onCoverChange }: Props) {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...photos, url]);
    setUrlInput('');
    if (!coverImage && photos.length === 0) onCoverChange(url);
  };

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const useCloud = isCloudinaryConfigured;

    // 데모 모드(localStorage) 시 용량 체크
    if (!useCloud) {
      const remaining = estimateLocalStorageRemaining();
      if (remaining < 50_000) {
        toast('저장 공간이 부족합니다. 기존 사진을 삭제 후 다시 시도해주세요.', 'error');
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const newUrls: string[] = [];
      const fileList = Array.from(files);

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // 원본 파일 10MB 초과 시 건너뛰기
        if (file.size > 10 * 1024 * 1024) {
          toast(`"${file.name}" 파일이 너무 큽니다 (10MB 이하만 가능).`, 'error');
          continue;
        }

        setUploadProgress(`압축 중 (${i + 1}/${fileList.length})`);

        // 2MB 이하로 압축
        const compressed = await compressImage(file);

        if (useCloud) {
          // Cloudinary에 직접 업로드
          setUploadProgress(`업로드 중 (${i + 1}/${fileList.length})`);
          const url = await uploadToCloudinary(compressed);
          newUrls.push(url);
        } else {
          // 데모 모드: base64로 변환하여 localStorage에 저장
          const dataUrl = await blobToDataUrl(compressed);
          newUrls.push(dataUrl);
        }
      }

      if (newUrls.length > 0) {
        const next = [...photos, ...newUrls];
        onChange(next);
        if (!coverImage && photos.length === 0) {
          onCoverChange(newUrls[0]);
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '사진 업로드에 실패했습니다.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress('');
      e.target.value = '';
    }
  };

  const remove = (index: number) => {
    const removed = photos[index];
    const next = photos.filter((_, i) => i !== index);
    onChange(next);
    if (removed === coverImage) {
      onCoverChange(next[0] ?? '');
    }
  };

  const setCover = (url: string) => {
    onCoverChange(url);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        사진 ({photos.length})
      </label>

      {/* 추가 방법 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="이미지 URL 붙여넣기"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#4a3f35] text-sm focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 focus:border-transparent bg-white dark:bg-[#1a1208] dark:text-slate-100"
        />
        <button
          type="button"
          onClick={addUrl}
          className="px-3 py-2 bg-[#f48c25] text-white text-sm rounded-lg cursor-pointer border-0 hover:bg-[#d97a1e] transition-colors"
        >
          추가
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 bg-gray-100 dark:bg-[#1a1208] text-gray-700 dark:text-slate-300 text-sm rounded-lg cursor-pointer border-0 hover:bg-gray-200 dark:hover:bg-[#2a1f15] transition-colors disabled:opacity-50"
        >
          {uploading ? (uploadProgress || '처리중...') : '파일'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      {/* 사진 미리보기 그리드 */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100 dark:bg-[#1a1208]">
              <img
                src={url}
                alt={`사진 ${i + 1}`}
                className="w-full h-full object-cover"
              />

              {/* 대표 이미지 뱃지 */}
              {url === coverImage && (
                <div className="absolute top-1 left-1 bg-[#f48c25] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  대표
                </div>
              )}

              {/* 호버 오버레이 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {url !== coverImage && (
                  <button
                    type="button"
                    onClick={() => setCover(url)}
                    className="bg-white/90 text-gray-700 text-[10px] px-2 py-1 rounded border-0 cursor-pointer hover:bg-white"
                  >
                    대표
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="bg-red-500/90 text-white text-[10px] px-2 py-1 rounded border-0 cursor-pointer hover:bg-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {photos.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-[#4a3f35] rounded-xl p-8 text-center cursor-pointer hover:border-[#f48c25] hover:bg-[#f48c25]/5 transition-colors"
        >
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">클릭하여 사진을 추가하거나</p>
          <p className="text-xs text-gray-300 dark:text-slate-600">위에서 URL을 붙여넣기 하세요</p>
        </div>
      )}
    </div>
  );
}
