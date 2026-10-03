import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY, errMsg } from '../lib/api';
import type { AdminUser } from '../types';

interface AuthCtx {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const s = localStorage.getItem(USER_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data?.data;
        if (u?.role !== 'super_admin') return clear();
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(clear)
      .finally(() => setIsLoading(false));
  }, []);

  const login: AuthCtx['login'] = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: u } = res.data.data;
      if (u.role !== 'super_admin') {
        return { success: false, message: 'Akun ini bukan Super Admin. Akses ditolak.' };
      }
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch (err) {
      return { success: false, message: errMsg(err, 'Login gagal, periksa email dan password.') };
    }
  };

  const logout = () => {
    clear();
    window.location.href = '/admin/login';
  };

  return <Ctx.Provider value={{ user, isLoading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
