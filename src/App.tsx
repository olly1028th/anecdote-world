import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';
import TripFormPage from './pages/TripFormPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

const PinFormPage = lazy(() => import('./pages/PinFormPage'));

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <>
        <Header />
        <main className="pb-24">
          <Outlet />
        </main>
        <BottomNav />
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
