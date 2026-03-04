import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  photos: string[];
  captions?: Record<string, string>;
  onSetCover?: (url: string) => void;
  onCaptionChange?: (url: string, caption: string) => void;
  action?: ReactNode;
}

export default function PhotoGallery({ photos, captions, onSetCover, onCaptionChange, action }: Props) {
  // albumOpen: 스크롤 앨범 뷰 열림 여부, scrollToIndex: 열 때 스크롤 위치
  const [albumOpen, setAlbumOpen] = useState(false);
  const [scrollToIndex, setScrollToIndex] = useState(0);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (photos.length === 0) return null;

  const openAlbum = (index: number) => {
    setScrollToIndex(index);
    setAlbumOpen(true);
  };

  const closeAlbum = () => {
    setAlbumOpen(false);
    setEditingUrl(null);
  };

  const startEditCaption = (url: string) => {
    setCaptionDraft(captions?.[url] || '');
    setEditingUrl(url);
  };

  const saveCaption = () => {
    if (editingUrl && onCaptionChange) {
      onCaptionChange(editingUrl, captionDraft.trim());
    }
    setEditingUrl(null);
  };

  return (
    <section>
      {/* 썸네일 그리드 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border-[3px] border-slate-900 retro-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Photos ({photos.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAlbum(0)}
              className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
            >
              앨범 보기
            </button>
            {action}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {photos.map((url, i) => {
            const caption = captions?.[url];
            return (
              <button
                key={i}
                type="button"
                onClick={() => openAlbum(i)}
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

      {/* 스크롤 앨범 뷰 (전체화면 오버레이) */}
      {albumOpen && (
        <AlbumView
          photos={photos}
          captions={captions}
          scrollToIndex={scrollToIndex}
          editingUrl={editingUrl}
          captionDraft={captionDraft}
          onClose={closeAlbum}
          onStartEdit={onCaptionChange ? startEditCaption : undefined}
          onCaptionDraftChange={setCaptionDraft}
          onSaveCaption={saveCaption}
          onCancelEdit={() => setEditingUrl(null)}
          onSetCover={onSetCover}
          photoRefs={photoRefs}
        />
      )}
    </section>
  );
}

/** 전체화면 스크롤 가능한 앨범 뷰 */
function AlbumView({
  photos,
  captions,
  scrollToIndex,
  editingUrl,
  captionDraft,
  onClose,
  onStartEdit,
  onCaptionDraftChange,
  onSaveCaption,
  onCancelEdit,
  onSetCover,
  photoRefs,
}: {
  photos: string[];
  captions?: Record<string, string>;
  scrollToIndex: number;
  editingUrl: string | null;
  captionDraft: string;
  onClose: () => void;
  onStartEdit?: (url: string) => void;
  onCaptionDraftChange: (v: string) => void;
  onSaveCaption: () => void;
  onCancelEdit: () => void;
  onSetCover?: (url: string) => void;
  photoRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 열릴 때 해당 사진으로 스크롤 + body overflow 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      photoRefs.current[scrollToIndex]?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 50);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [scrollToIndex, photoRefs]);

  // ESC 키로 닫기
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !editingUrl) onClose();
  }, [onClose, editingUrl]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div role="dialog" aria-modal="true" aria-label="사진 앨범" className="fixed inset-0 z-50 bg-[#1a1208]/95 dark:bg-black/95">
      {/* 상단 헤더 (고정) */}
      <div className="sticky top-0 z-10 bg-[#1a1208]/80 dark:bg-black/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
            Photos · {photos.length}장
          </span>
        </div>
      </div>

      {/* 스크롤 가능한 사진 피드 */}
      <div
        ref={containerRef}
        className="h-[calc(100dvh-56px)] overflow-y-auto scroll-smooth"
      >
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {photos.map((url, i) => {
            const caption = captions?.[url] || '';
            const isEditing = editingUrl === url;
            return (
              <div
                key={i}
                ref={(el) => { photoRefs.current[i] = el; }}
                className="scroll-mt-16"
              >
                {/* 사진 번호 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#f48c25] text-white text-xs font-bold flex items-center justify-center border-2 border-white/20">
                    {i + 1}
                  </span>
                  <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                    {i + 1} / {photos.length}
                  </span>
                  {onSetCover && (
                    <button
                      type="button"
                      onClick={() => onSetCover(url)}
                      className="ml-auto text-white/30 hover:text-[#f48c25] text-[10px] font-bold uppercase tracking-wider cursor-pointer bg-transparent border-0 transition-colors"
                    >
                      대표 설정
                    </button>
                  )}
                </div>

                {/* 사진 */}
                <div className="rounded-xl overflow-hidden border-[3px] border-white/15">
                  <img
                    src={url}
                    alt={caption || `사진 ${i + 1}`}
                    className="w-full object-contain max-h-[70vh] bg-black"
                    loading="lazy"
                  />
                </div>

                {/* 캡션 영역 */}
                <div className="mt-3 px-1">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={captionDraft}
                        onChange={(e) => onCaptionDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveCaption();
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        placeholder="사진에 대한 한줄 메모..."
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-lg bg-white/10 border-2 border-white/20 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40 placeholder-white/30"
                      />
                      <button
                        type="button"
                        onClick={onSaveCaption}
                        className="px-3 py-2 rounded-lg bg-[#f48c25] text-white text-xs font-bold uppercase border-0 cursor-pointer hover:bg-[#d97a1e] transition-colors"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white/60 text-xs font-bold uppercase border-2 border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : caption ? (
                    <p
                      onClick={onStartEdit ? () => onStartEdit(url) : undefined}
                      className={`text-white/70 text-sm font-medium italic ${
                        onStartEdit ? 'cursor-pointer hover:text-white transition-colors' : ''
                      }`}
                    >
                      "{caption}"
                    </p>
                  ) : onStartEdit ? (
                    <button
                      type="button"
                      onClick={() => onStartEdit(url)}
                      className="text-white/20 text-xs font-medium hover:text-white/50 transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      + 캡션 추가
                    </button>
                  ) : null}
                </div>

                {/* 구분선 (마지막 제외) */}
                {i < photos.length - 1 && (
                  <div className="mt-6 border-t border-white/5" />
                )}
              </div>
            );
          })}

          {/* 하단 여백 */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}
