import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// PWA 업데이트 감지 — 새 버전 배포 시 즉시 반영
async function registerSW() {
  const { registerSW: register } = await import('virtual:pwa-register')
  register({
    onNeedRefresh() {
      // 새 버전 감지 → 업데이트 알림 배너 표시
      const banner = document.createElement('div')
      banner.id = 'sw-update-banner'
      banner.innerHTML = `
        <div style="
          position:fixed;bottom:80px;left:12px;right:12px;z-index:9999;
          background:#1c140d;color:#fff;padding:14px 16px;border-radius:12px;
          border:3px solid #f48c25;box-shadow:4px 4px 0 0 #f48c25;
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          font-family:'Space Grotesk',system-ui,sans-serif;
          max-width:400px;margin:0 auto;
        ">
          <span style="font-size:13px;font-weight:600;">새 버전이 있습니다!</span>
          <button id="sw-update-btn" style="
            background:#f48c25;color:#1c140d;border:2px solid #1c140d;
            border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;
            cursor:pointer;white-space:nowrap;
          ">업데이트</button>
        </div>
      `
      document.body.appendChild(banner)
      document.getElementById('sw-update-btn')?.addEventListener('click', () => {
        // 새 서비스 워커 즉시 활성화 + 페이지 새로고침
        banner.remove()
        register({
          immediate: true,
          onRegisteredSW(_url, registration) {
            registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
          },
        })
        window.location.reload()
      })
    },
    onOfflineReady() {
      // 오프라인 준비 완료 — 조용히 처리
    },
    immediate: true,
  })
}

registerSW()
