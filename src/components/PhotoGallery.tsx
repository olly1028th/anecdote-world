import { useState } from 'react';

interface Props {
  photos: string[];
  onSetCover?: (url: string) => void;
}

export default function PhotoGallery({ photos, onSetCover }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const close = () => setSelectedIndex(null);
  const prev = () => setSelectedIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  const next = () => setSelectedIndex((i) => (i !== null ? (i + 1) % photos.length : null));

  return (
    <section>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
          Photos ({photos.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer group border-2 border-slate-900 p-0 bg-slate-100 hover:-translate-y-0.5 transition-transform"
            >
              <img src={url} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* 라이트박스 */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={close}>
          <button onClick={close} className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border-2 border-white/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img src={photos[selectedIndex]} alt={`사진 ${selectedIndex + 1}`} className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl border-4 border-white/20" onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border-2 border-white/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/60 text-sm font-bold">{selectedIndex + 1} / {photos.length}</span>
            {onSetCover && (
              <button onClick={() => { onSetCover(photos[selectedIndex]); close(); }} className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/20 cursor-pointer transition-colors">
                대표 이미지로 설정
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
