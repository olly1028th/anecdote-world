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
      <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">
            Photos ({photos.length})
          </h3>
          <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
        </div>

        {/* 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="relative aspect-[4/3] overflow-hidden rounded-xl cursor-pointer group border-2 border-[#2D3436] p-0 bg-[#F9F4E8] shadow-[2px_2px_0px_0px_#2D3436] hover:-translate-y-0.5 transition-transform"
            >
              <img
                src={url}
                alt={`사진 ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* 라이트박스 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#2D3436]/95 flex items-center justify-center"
          onClick={close}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-2"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 이전 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border-2 border-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 이미지 */}
          <img
            src={photos[selectedIndex]}
            alt={`사진 ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl border-4 border-white/20"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border-2 border-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 하단 정보 */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/60 text-sm font-black">
              {selectedIndex + 1} / {photos.length}
            </span>
            {onSetCover && (
              <button
                onClick={() => { onSetCover(photos[selectedIndex]); close(); }}
                className="text-sm font-black text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/20 cursor-pointer transition-colors"
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
