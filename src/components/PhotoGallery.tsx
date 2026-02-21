import { useState } from 'react';

interface Props {
  photos: string[];
  onSetCover?: (url: string) => void;
}

export default function PhotoGallery({ photos, onSetCover }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const close = () => setSelectedIndex(null);

  const prev = () =>
    setSelectedIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));

  const next = () =>
    setSelectedIndex((i) => (i !== null ? (i + 1) % photos.length : null));

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        사진 ({photos.length})
      </h3>

      {/* 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className="relative aspect-[4/3] overflow-hidden rounded-xl cursor-pointer group border-0 p-0 bg-gray-100"
          >
            <img
              src={url}
              alt={`사진 ${i + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {/* 라이트박스 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-2"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 이전 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 text-white/80 hover:text-white cursor-pointer bg-black/30 hover:bg-black/50 rounded-full p-2 border-0 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 이미지 */}
          <img
            src={photos[selectedIndex]}
            alt={`사진 ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 text-white/80 hover:text-white cursor-pointer bg-black/30 hover:bg-black/50 rounded-full p-2 border-0 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 하단 정보 */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/60 text-sm">
              {selectedIndex + 1} / {photos.length}
            </span>
            {onSetCover && (
              <button
                onClick={() => { onSetCover(photos[selectedIndex]); close(); }}
                className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-colors"
              >
                대표 이미지로 설정
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
