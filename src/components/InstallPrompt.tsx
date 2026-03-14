import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 이미 설치된 앱이면 표시하지 않음
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // 사용자가 이전에 닫았으면 7일간 숨김
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000)
      return;

    // iOS Safari 감지
    const ua = navigator.userAgent;
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    // Android / Chrome: beforeinstallprompt 이벤트
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm">
      <div className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[6px_6px_0px_0px_rgba(28,20,13,1)] dark:border-slate-100 dark:bg-[#221910]">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="Anecdote World"
              className="h-10 w-10 rounded-lg border-2 border-slate-900 dark:border-slate-100"
            />
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                앱으로 설치하기
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                홈 화면에서 바로 실행
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isIOS ? (
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Safari 하단의{' '}
              <span className="inline-flex translate-y-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{' '}
              공유 버튼 → <strong>"홈 화면에 추가"</strong>를 눌러주세요
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full rounded-lg border-[3px] border-slate-900 bg-[#f48c25] px-4 py-2.5 text-sm font-bold tracking-tight text-slate-900 shadow-[3px_3px_0px_0px_rgba(28,20,13,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(28,20,13,1)]"
          >
            설치하기
          </button>
        )}
      </div>
    </div>
  );
}
