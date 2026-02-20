import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';
import TripFormPage from './pages/TripFormPage';
import PinFormPage from './pages/PinFormPage';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Routes>
        {/* 로그인 페이지 (Header 없음) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 인증 필요 페이지들 */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <>
                <Header />
                <main>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/trip/new" element={<TripFormPage />} />
                    <Route path="/trip/edit/:id" element={<TripFormPage />} />
                    <Route path="/trip/:id" element={<TripDetailPage />} />
                    <Route path="/pin/new" element={<PinFormPage />} />
                    <Route path="/pin/edit/:id" element={<PinFormPage />} />
                  </Routes>
                </main>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
