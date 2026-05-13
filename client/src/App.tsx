import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import { TopNav } from './components/ui';

function App() {
  const { user, loading, logout } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-6 text-slate-200">Loading…</div>;

  const authed = !!user;
  const isAuthRoute =
    loc.pathname === '/login' ||
    loc.pathname === '/signup' ||
    loc.pathname === '/forgot-password' ||
    loc.pathname === '/reset-password';

  return (
    <div className="min-h-dvh bg-slate-950">
      {authed && user && !isAuthRoute && <TopNav userName={user.name} onLogout={() => void logout()} />}

      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/signup" element={authed ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/forgot-password" element={authed ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={authed ? <Navigate to="/dashboard" /> : <ResetPasswordPage />} />

        <Route path="/" element={<Navigate to={authed ? '/dashboard' : '/login'} />} />

        <Route path="/dashboard" element={authed ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="/projects" element={authed ? <ProjectsPage /> : <Navigate to="/login" />} />
        <Route path="/projects/:projectId" element={authed ? <ProjectDetailPage /> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App
