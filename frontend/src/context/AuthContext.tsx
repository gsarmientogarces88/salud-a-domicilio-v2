'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, setToken, removeToken, loginRequest, registerRequest, laboratoryLoginRequest } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'LABORATORY';
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginLaboratory: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiFetch<{ data: { user: User } }>('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        removeToken();
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setToken(res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const loginLaboratory = async (email: string, password: string) => {
    const res = await laboratoryLoginRequest(email, password);
    setToken(res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const register = async (data: any) => {
    const res = await registerRequest(data);
    setToken(res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginLaboratory, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
