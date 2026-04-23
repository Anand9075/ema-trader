import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('ema_token');
    if (!token) { setLoading(false); return; }
    try   { setUser(await authAPI.me()); }
    catch { localStorage.removeItem('ema_token'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const d = await authAPI.login({ email, password });
    localStorage.setItem('ema_token', d.token);
    setUser(d.user); return d.user;
  };
  const register = async (name, email, password) => {
    const d = await authAPI.register({ name, email, password });
    localStorage.setItem('ema_token', d.token);
    setUser(d.user); return d.user;
  };
  const logout = () => { localStorage.removeItem('ema_token'); setUser(null); };
  const updateUser = u => setUser(prev => ({ ...prev, ...u }));

  return <Ctx.Provider value={{ user, loading, login, register, logout, updateUser, reload: loadUser }}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }