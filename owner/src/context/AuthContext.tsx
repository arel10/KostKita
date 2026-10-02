import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kostkita_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kostkita_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('kostkita_user', JSON.stringify(res.data.data));
      }
    } catch {
      // Token might be invalid or expired
      logout();
    }
  };

  useEffect(() => {
    if (token) {
      reloadUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data.data;
      
      // Make sure the role is owner or super_admin
      if (receivedUser.role !== 'owner' && receivedUser.role !== 'super_admin') {
        return {
          success: false,
          message: 'Akun Anda bukan akun Pemilik Kost (Owner).',
        };
      }

      localStorage.setItem('kostkita_token', receivedToken);
      localStorage.setItem('kostkita_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Login gagal, periksa email dan password.';
      return { success: false, message };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        phone: phone?.trim() ? phone.trim() : undefined,
        role: 'owner',
      });
      const { token: receivedToken, user: receivedUser } = res.data.data;
      localStorage.setItem('kostkita_token', receivedToken);
      localStorage.setItem('kostkita_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Pendaftaran gagal.';
      return { success: false, message };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await api.post('/auth/google', { credential });
      const { token: receivedToken, user: receivedUser } = res.data.data;

      if (receivedUser.role !== 'owner' && receivedUser.role !== 'super_admin') {
        return {
          success: false,
          message: 'Akun Anda bukan akun Pemilik Kost (Owner).',
        };
      }

      localStorage.setItem('kostkita_token', receivedToken);
      localStorage.setItem('kostkita_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Autentikasi dengan Google gagal.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('kostkita_token');
    localStorage.removeItem('kostkita_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithGoogle, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
