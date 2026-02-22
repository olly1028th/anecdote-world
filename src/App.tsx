import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TripFormModal from './components/TripFormModal';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';
import TripFormPage from './pages/TripFormPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

const PinFormPage = lazy(() => import('./pages/PinFormPage'));

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

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors duration-200">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/trip/new" element={<TripFormPage />} />
          <Route path="/trip/edit/:id" element={<TripFormPage />} />
          <Route path="/trip/:id" element={<TripDetailPage />} />
          <Route
            path="/pin/new"
            element={<Suspense fallback={<Loading />}><PinFormPage /></Suspense>}
          />
          <Route
            path="/pin/edit/:id"
            element={<Suspense fallback={<Loading />}><PinFormPage /></Suspense>}
          />
        </Route>
      </Routes>
    </div>
  );
}
