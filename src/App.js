import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { usePolling } from './hooks/usePolling';
import { alertsAPI } from './api';

import Login    from './components/auth/Login';
import Register from './components/auth/Register';
import Sidebar  from './components/shared/Sidebar';
import TopBar   from './components/shared/TopBar';
import Ticker   from './components/shared/Ticker';

import Dashboard  from './components/dashboard/Dashboard';
import Portfolio  from './components/portfolio/Portfolio';
import Scanner    from './components/scanner/Scanner';
import Alerts     from './components/alerts/Alerts';
import History    from './components/history/History';
import Calendar   from './components/history/Calendar';
import Settings   from './components/settings/Settings';

/* ── Loading spinner shown while auth state resolves ── */
function FullPageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080d1a', flexDirection:'column', gap:14 }}>
      <div style={{ width:44, height:44, background:'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📈</div>
      <div style={{ width:24, height:24, border:'2px solid rgba(255,255,255,0.08)', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Protected shell — wraps all authenticated pages ── */
function AppShell() {
  const { user, loading } = useAuth();
  const [extraTickers, setExtraTickers] = useState([]);

  // Poll alerts globally for the unread badge in sidebar/topbar
  const { data: alertData } = usePolling(() => alertsAPI.getAll(), 30000, []);
  const unread = (alertData || []).filter(a => !a.read).length;

  if (loading) return <FullPageLoader/>;
  if (!user)   return <Navigate to="/login" replace/>;

  const handleStockSelect = stock => {
    if (stock?.symbol && !extraTickers.includes(stock.symbol)) {
      setExtraTickers(prev => [...prev.slice(-4), stock.symbol]);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar alertCount={unread}/>
      <div className="main-area">
        <TopBar onStockSelect={handleStockSelect} alertCount={unread}/>
        <Ticker extraSymbols={extraTickers}/>
        <div className="page-body">
          <Routes>
            <Route path="/"          element={<Dashboard/>}/>
            <Route path="/portfolio" element={<Portfolio/>}/>
            <Route path="/scanner"   element={<Scanner/>}/>
            <Route path="/alerts"    element={<Alerts/>}/>
            <Route path="/history"   element={<History/>}/>
            <Route path="/calendar"  element={<Calendar/>}/>
            <Route path="/settings"  element={<Settings/>}/>
            <Route path="*"          element={<Navigate to="/" replace/>}/>
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ── Auth gate — redirects logged-in users away from /login ── */
function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader/>;
  if (user)    return <Navigate to="/" replace/>;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<AuthGate><Login/></AuthGate>}/>
            <Route path="/register" element={<AuthGate><Register/></AuthGate>}/>
            <Route path="/*"        element={<AppShell/>}/>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}