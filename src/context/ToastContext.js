import React, { createContext, useContext, useState, useCallback } from 'react';
const Ctx = createContext(null);
const ICONS = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', sub = '') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { id, message, type, sub }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  return (
    <Ctx.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[t.type] || 'ℹ'}</span>
              <div><div className="toast-msg">{t.message}</div>{t.sub && <div className="toast-sub">{t.sub}</div>}</div>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
export function useToast() { return useContext(Ctx); }