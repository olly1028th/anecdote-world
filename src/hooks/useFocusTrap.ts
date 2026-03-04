import { useEffect, useRef } from 'react';

/**
 * 모달/다이얼로그용 포커스 트랩 훅.
 * - 마운트 시 다이얼로그에 포커스
 * - Tab 키가 다이얼로그 안에서만 순환
 * - ESC 키로 닫기 (onClose가 제공된 경우)
 * - 언마운트 시 이전 포커스 복원
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(onClose?: () => void) {
  const ref = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    // 다이얼로그 자체에 포커스 (내부에 autoFocus 요소가 있으면 그쪽으로 이동)
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return ref;
}
