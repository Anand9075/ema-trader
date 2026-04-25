import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { usePolling } from './hooks/usePolling';
import { alertsAPI } from './api';
import Sidebar from './components/shared/Sidebar';
import TopBar from './components/shared/TopBar';
import Ticker from './components/shared/Ticker';
import Dashboard from './components/dashboard/Dashboard';
import Portfolio from './components/portfolio/Portfolio';
import Scanner from './components/scanner/Scanner';
import Alerts from './components/alerts/Alerts';
import History from './components/history/History';
import Calendar from './components/history/Calendar';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

function LoadingScreen() {
  return (
    <div className="loading-box" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 34, height: 34 }} />
      <div style={{ marginTop: 12, color: 'var(--text2)', fontWeight: 700 }}>Loading EMA Terminal...</div>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { data: alerts = [] } = usePolling(() => alertsAPI.getAll(), 30000, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const unread = Array.isArray(alerts) ? alerts.filter(a => !a.read).length : 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar alertCount={unread} />
        <Ticker />
        <main className="page-wrap">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/history" element={<History />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
