/**
 * 예약 서류 업로드/관리 컴포넌트
 * PDF, 이미지 등 여행 관련 문서를 업로드하고 카테고리별로 관리
 */
import { useState, useRef } from 'react';
import type { TripDocument, DocumentCategory } from '../types/trip';

interface Props {
  documents: TripDocument[];
  onChange: (documents: TripDocument[]) => void;
}

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string; icon: string }[] = [
  { value: 'flight', label: '항공', icon: '✈️' },
  { value: 'hotel', label: '숙소', icon: '🏨' },
  { value: 'ticket', label: '티켓', icon: '🎫' },
  { value: 'visa', label: '비자', icon: '📋' },
  { value: 'insurance', label: '보험', icon: '🛡️' },
  { value: 'other', label: '기타', icon: '📎' },
];

const CATEGORY_LABEL: Record<string, { label: string; icon: string }> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, { label: c.label, icon: c.icon }]),
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';

export default function DocumentUpload({ documents, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleMultipleFiles = (files: FileList) => {
    const promises: Promise<TripDocument>[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: 파일 크기가 10MB를 초과합니다.`);
        continue;
      }
      promises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              url: reader.result as string,
              name: file.name,
              category: guessCategory(file.name),
            });
          };
          reader.readAsDataURL(file);
        }),
      );
    }
    Promise.all(promises).then((newDocs) => {
      onChange([...documents, ...newDocs]);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  };

  const removeDoc = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, category: DocumentCategory) => {
    onChange(documents.map((d, i) => (i === index ? { ...d, category } : d)));
  };

  const updateName = (index: number, name: string) => {
    onChange(documents.map((d, i) => (i === index ? { ...d, name } : d)));
  };

  return (
    <div className="space-y-3">
      {/* 파일 목록 */}
      {documents.map((doc, i) => {
        const cat = CATEGORY_LABEL[doc.category] || CATEGORY_LABEL.other;
        return (
          <div
            key={doc.id || `${doc.name}-${i}`}
            className="flex items-center gap-3 bg-[#F9F4E8] dark:bg-slate-700 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600"
          >
            <span className="text-lg shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="text"
                value={doc.name}
                onChange={(e) => updateName(i, e.target.value)}
                className="w-full text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none focus:underline"
              />
              <select
                value={doc.category}
                onChange={(e) => updateCategory(i, e.target.value as DocumentCategory)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-transparent border border-slate-300 dark:border-slate-500 rounded px-1.5 py-0.5 cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeDoc(i)}
              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
              title="삭제"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}

      {/* 업로드 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-[3px] border-dashed cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#f48c25] bg-[#f48c25]/5'
            : 'border-slate-300 dark:border-slate-600 hover:border-[#f48c25]'
        }`}
      >
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <p className="text-xs text-slate-400 font-medium">
          PDF, 이미지, 문서 파일을 업로드하세요
        </p>
        <p className="text-[10px] text-slate-300">최대 10MB · 드래그 앤 드롭 가능</p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

/** 파일명으로 카테고리 추측 */
function guessCategory(name: string): DocumentCategory {
  const lower = name.toLowerCase();
  if (/flight|boarding|항공|비행/.test(lower)) return 'flight';
  if (/hotel|숙소|booking|예약|accommodation|호텔|airbnb/.test(lower)) return 'hotel';
  if (/visa|비자/.test(lower)) return 'visa';
  if (/insurance|보험/.test(lower)) return 'insurance';
  if (/ticket|티켓|입장/.test(lower)) return 'ticket';
  return 'other';
}
