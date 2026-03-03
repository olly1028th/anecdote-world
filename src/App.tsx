import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TripFormModal from './components/TripFormModal';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const TripFormPage = lazy(() => import('./pages/TripFormPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PinFormPage = lazy(() => import('./pages/PinFormPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const SharedViewPage = lazy(() => import('./pages/SharedViewPage'));

function ProtectedLayout() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSaved = useCallback(() => {
    // 홈이 아니면 홈으로 이동 (useTrips가 trip-added 이벤트로 자동 refetch)
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [navigate, location.pathname]);

  // SpaceTrips "새 행성 만들기" 버튼에서 모달 열기
  useEffect(() => {
    const handler = () => setModalOpen(true);
    window.addEventListener('open-trip-modal', handler);
    return () => window.removeEventListener('open-trip-modal', handler);
  }, []);

  return (
    <ProtectedRoute>
      <>
        <Header />
        <main className="pb-24">
          <Outlet />
        </main>
        <BottomNav onAddClick={() => setModalOpen(true)} />
        <TripFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      </>
    </ProtectedRoute>
  );
}

const Loading = () => (
  <div className="max-w-6xl mx-auto px-4 py-20 text-center">
    <div className="animate-pulse text-gray-400">로딩 중...</div>
  </div>
);

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-6">
      <h1 className="text-6xl font-bold uppercase italic tracking-tighter text-slate-900 dark:text-slate-100">404</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400">페이지를 찾을 수 없습니다</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-block px-6 py-3 bg-[#f48c25] text-white font-bold border-[3px] border-slate-900 rounded-xl retro-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors duration-200">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<Loading />}><ProfilePage /></Suspense>} />
          <Route path="/trip/new" element={<Suspense fallback={<Loading />}><TripFormPage /></Suspense>} />
          <Route path="/trip/edit/:id" element={<Suspense fallback={<Loading />}><TripFormPage /></Suspense>} />
          <Route path="/trip/:id" element={<Suspense fallback={<Loading />}><TripDetailPage /></Suspense>} />
          <Route path="/timeline" element={<Suspense fallback={<Loading />}><TimelinePage /></Suspense>} />
          <Route path="/shared/:ownerId" element={<Suspense fallback={<Loading />}><SharedViewPage /></Suspense>} />
          <Route
            path="/pin/new"
            element={<Suspense fallback={<Loading />}><PinFormPage /></Suspense>}
          />
          <Route
            path="/pin/edit/:id"
            element={<Suspense fallback={<Loading />}><PinFormPage /></Suspense>}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
