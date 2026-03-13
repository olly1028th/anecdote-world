/**
 * 예약 서류 목록 표시 (읽기 전용)
 * 카테고리 아이콘 + 파일명 + 열기 버튼
 */
import { useState, type ReactNode } from 'react';
import type { TripDocument } from '../types/trip';
import { downloadDocumentAsBlob } from '../lib/storage';

interface Props {
  documents: TripDocument[];
  action?: ReactNode;
}

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  flight: { icon: '✈️', label: '항공', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' },
  hotel: { icon: '🏨', label: '숙소', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300' },
  ticket: { icon: '🎫', label: '티켓', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300' },
  visa: { icon: '📋', label: '비자', color: 'bg-green-100 dark:bg-green-900/30 border-green-300' },
  insurance: { icon: '🛡️', label: '보험', color: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300' },
  other: { icon: '📎', label: '기타', color: 'bg-slate-100 dark:bg-slate-700 border-slate-300' },
};

/** Blob을 새 탭에 직접 렌더링 */
function renderBlobInWindow(w: Window, blob: Blob, name: string) {
  const blobUrl = URL.createObjectURL(blob);
  const type = blob.type;

  if (type === 'application/pdf') {
    // PDF → embed로 표시
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><title>${name}</title><style>body{margin:0;overflow:hidden}</style></head><body><embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" style="position:fixed;top:0;left:0;width:100%;height:100%"/></body></html>`);
    w.document.close();
  } else if (type.startsWith('image/')) {
    // 이미지 → img 태그로 표시
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><title>${name}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}</style></head><body><img src="${blobUrl}" alt="${name}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`);
    w.document.close();
  } else {
    // 기타 파일 → 다운로드 링크
    w.location.href = blobUrl;
  }
}

/** 에러 화면을 새 탭에 렌더링 */
function renderErrorInWindow(w: Window, name: string) {
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><title>${name}</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;gap:12px}h2{margin:0;color:#333}p{margin:0;max-width:400px;text-align:center;line-height:1.5}</style></head><body><h2>파일을 열 수 없습니다</h2><p>Supabase Storage 설정을 확인해주세요.<br/>Dashboard → Storage → trip-documents → 버킷 설정에서 Public 활성화가 필요합니다.</p></body></html>`);
  w.document.close();
}

export default function DocumentList({ documents, action }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleOpen = async (doc: TripDocument, index: number) => {
    const key = doc.id || `${doc.name}-${index}`;

    // 클릭 직후 동기적으로 창을 열어야 팝업 차단 방지
    const w = window.open('', '_blank');
    if (!w) return;

    // data URL은 바로 렌더링
    if (doc.url.startsWith('data:')) {
      const res = await fetch(doc.url);
      const blob = await res.blob();
      renderBlobInWindow(w, blob, doc.name);
      return;
    }

    // 로딩 화면 표시
    w.document.title = doc.name;
    w.document.body.style.cssText = 'margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;';
    w.document.body.textContent = '로딩 중...';

    try {
      setLoadingId(key);
      const blob = await downloadDocumentAsBlob(doc.url);
      if (blob) {
        renderBlobInWindow(w, blob, doc.name);
      } else {
        renderErrorInWindow(w, doc.name);
      }
    } catch (e) {
      console.error('[DocumentList] 파일 열기 실패:', e);
      renderErrorInWindow(w, doc.name);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Reservations</h3>
        {action}
      </div>
      <div className="space-y-2">
        {documents.map((doc, i) => {
          const meta = CATEGORY_META[doc.category] || CATEGORY_META.other;
          const key = doc.id || `${doc.name}-${i}`;
          const isLoading = loadingId === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleOpen(doc, i)}
              disabled={isLoading}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 ${meta.color} hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer text-left ${isLoading ? 'opacity-60' : ''}`}
            >
              <span className="text-xl shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{doc.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{meta.label}</p>
              </div>
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
