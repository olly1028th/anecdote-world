/** 인라인 편집 공통 버튼 (TripDetailPage 섹션에서 공유) */

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25] hover:text-[#d97a1e] cursor-pointer border-2 border-[#f48c25] px-3 py-1 rounded-full hover:bg-[#f48c25]/10 transition-colors bg-transparent"
    >
      Edit
    </button>
  );
}

export function SaveCancelButtons({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving?: boolean }) {
  return (
    <div className="flex gap-2 mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-slate-500 bg-white border-2 border-slate-900 cursor-pointer hover:bg-gray-50 transition-all"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight text-white bg-[#f48c25] border-2 border-slate-900 retro-shadow hover:bg-[#d97a1e] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
