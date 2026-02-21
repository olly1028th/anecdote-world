import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'anecdote-dark-mode';

/**
 * 다크 모드 상태를 관리하는 훅.
 * 1순위: localStorage에 저장된 사용자 선택
 * 2순위: 시스템 설정 (prefers-color-scheme)
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // <html> 요소에 dark 클래스 토글
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { isDark, toggle };
}
