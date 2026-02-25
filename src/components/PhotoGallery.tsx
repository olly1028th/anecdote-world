import { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  photos: string[];
  onSetCover?: (url: string) => void;
}

export default function PhotoGallery({ photos, onSetCover }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (photos.length === 0) return null;

  const close = () => setSelectedIndex(null);
  const prev = () => setSelectedIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  const next = () => setSelectedIndex((i) => (i !== null ? (i + 1) % photos.length : null));

  // 키보드 네비게이션
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') close();
  }, [selectedIndex]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (selectedIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, handleKeyDown]);

  // 터치 스와이프 핸들러
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    // 수평 스와이프가 수직보다 크고 최소 거리 충족
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) prev();
      else next();
    }
  };

  return (
    <section>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border-[3px] border-slate-900 retro-shadow">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
          Photos ({photos.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
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

      {/* 라이트박스 — 키보드 + 터치 스와이프 지원 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button onClick={close} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center z-10">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 sm:left-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2 sm:p-2.5 border-2 border-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center z-10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img
            src={photos[selectedIndex]}
            alt={`사진 ${selectedIndex + 1}`}
            className="max-w-[85vw] sm:max-w-[90vw] max-h-[75vh] sm:max-h-[80vh] object-contain rounded-xl sm:rounded-2xl border-4 border-white/20 select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 sm:right-4 text-white/80 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl p-2 sm:p-2.5 border-2 border-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center z-10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4" onClick={(e) => e.stopPropagation()}>
            {/* 사진 인디케이터 (도트) */}
            {photos.length <= 10 && (
              <div className="flex items-center gap-1.5 mb-1 sm:mb-0">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all border-0 cursor-pointer p-0 ${
                      i === selectedIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
            <span className="text-white/60 text-sm font-bold">{selectedIndex + 1} / {photos.length}</span>
            {onSetCover && (
              <button onClick={() => { onSetCover(photos[selectedIndex]); close(); }} className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/20 cursor-pointer transition-colors min-h-[44px]">
                대표 이미지로 설정
              </button>
            )}
          </div>
          {/* 스와이프 안내 (모바일) */}
          {photos.length > 1 && (
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-medium uppercase tracking-wider sm:hidden">
              Swipe to navigate
            </p>
          )}
        </div>
      )}
    </section>
  );
}
