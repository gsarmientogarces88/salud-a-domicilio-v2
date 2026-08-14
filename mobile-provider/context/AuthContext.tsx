import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/storage';
import type { AuthUser } from '../lib/types';

const DOCTOR_ONLY_MSG = 'Esta app es solo para prestadores médicos. Usa el sitio web para otros roles.';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function assertDoctor(user: AuthUser) {
  if (user.role !== 'DOCTOR') {
    throw new Error(DOCTOR_ONLY_MSG);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  const restore = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const res = await apiFetch<{ data: { user: AuthUser } }>('/auth/me');
      assertDoctor(res.data.user);
      setUser(res.data.user);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await apiFetch<{ data: { token: string; user: AuthUser } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    try {
      assertDoctor(res.data.user);
    } catch (e) {
      await clearToken();
      throw e;
    }
    await setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, login, logout, restore }),
    [user, loading, error, login, logout, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
