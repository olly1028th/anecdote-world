/**
 * 빈 상태 컴포넌트 - 데이터가 없을 때 표시
 * 일러스트 + 안내 메시지 + CTA 버튼
 */

interface Props {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* 일러스트 영역 */}
      <div className="relative mb-5">
        <div className="w-24 h-24 rounded-full bg-[#f48c25]/10 border-[3px] border-dashed border-[#f48c25]/30 flex items-center justify-center">
          <span className="text-4xl">{icon}</span>
        </div>
        {/* 데코 요소 */}
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#eab308]/30 border-2 border-[#eab308]/50" />
        <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-[#0d9488]/30 border-2 border-[#0d9488]/50" />
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 font-medium max-w-[240px] leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-[#f48c25] border-2 border-slate-900 retro-shadow hover:bg-[#d97a1e] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
