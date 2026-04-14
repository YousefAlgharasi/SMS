import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sms_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      localStorage.setItem('sms_token', res.data.token);
      localStorage.setItem('sms_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res;
    } finally { setLoading(false); }
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  };

  const hasRole = (...roles) => roles.includes(user?.role);
  const isAdmin = () => user?.role === 'admin';
  const canManageInventory = () => ['admin', 'supervisor', 'inventory_manager'].includes(user?.role);
  const isSupervisor = () => ['admin', 'supervisor'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isAdmin, canManageInventory, isSupervisor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};
