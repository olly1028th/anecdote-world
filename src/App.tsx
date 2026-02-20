import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';

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
                    <Route path="/trip/:id" element={<TripDetailPage />} />
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
