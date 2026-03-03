import { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  photos: string[];
  captions?: Record<string, string>;
  onSetCover?: (url: string) => void;
  onCaptionChange?: (url: string, caption: string) => void;
}

export default function PhotoGallery({ photos, captions, onSetCover, onCaptionChange }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (photos.length === 0) return null;

  const close = () => { setSelectedIndex(null); setEditingCaption(false); };
  const prev = () => { setSelectedIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)); setEditingCaption(false); };
  const next = () => { setSelectedIndex((i) => (i !== null ? (i + 1) % photos.length : null)); setEditingCaption(false); };

  const currentCaption = selectedIndex !== null ? captions?.[photos[selectedIndex]] || '' : '';

  const startEditCaption = () => {
    setCaptionDraft(currentCaption);
    setEditingCaption(true);
  };

  const saveCaption = () => {
    if (selectedIndex !== null && onCaptionChange) {
      onCaptionChange(photos[selectedIndex], captionDraft.trim());
    }
    setEditingCaption(false);
  };

  // 키보드 네비게이션
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (editingCaption) return; // 편집 중에는 키보드 네비게이션 비활성
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') close();
  }, [selectedIndex, editingCaption]);

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
          {photos.map((url, i) => {
            const caption = captions?.[url];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer group border-2 border-slate-900 p-0 bg-slate-100 hover:-translate-y-0.5 transition-transform"
              >
                <img src={url} alt={caption || `사진 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium truncate">{caption}</p>
                  </div>
                )}
              </button>
            );
          })}
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
          <div className="flex flex-col items-center max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[selectedIndex]}
              alt={currentCaption || `사진 ${selectedIndex + 1}`}
              className="max-w-[85vw] sm:max-w-[90vw] max-h-[65vh] sm:max-h-[70vh] object-contain rounded-xl sm:rounded-2xl border-4 border-white/20 select-none"
              draggable={false}
            />
            {/* 캡션 영역 */}
            <div className="mt-3 w-full max-w-lg px-4">
              {editingCaption ? (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(false); }}
                    placeholder="사진에 대한 한줄 메모..."
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 border-2 border-white/20 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 placeholder-white/40"
                  />
                  <button
                    onClick={saveCaption}
                    className="px-3 py-2 rounded-lg bg-[#f48c25] text-white text-xs font-bold uppercase border-0 cursor-pointer hover:bg-[#d97a1e] transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingCaption(false)}
                    className="px-3 py-2 rounded-lg bg-white/10 text-white/60 text-xs font-bold uppercase border-2 border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {currentCaption ? (
                    <p
                      onClick={onCaptionChange ? startEditCaption : undefined}
                      className={`text-white/80 text-sm font-medium italic text-center ${onCaptionChange ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    >
                      "{currentCaption}"
                    </p>
                  ) : onCaptionChange ? (
                    <button
                      onClick={startEditCaption}
                      className="text-white/30 text-xs font-medium hover:text-white/60 transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      + 캡션 추가
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
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
