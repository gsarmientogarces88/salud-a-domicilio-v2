import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { DoctorProfile, ServiceRequest } from '../lib/types';
import { useAuth } from './AuthContext';

type DoctorContextValue = {
  profile: DoctorProfile | null;
  available: ServiceRequest[];
  myServices: ServiceRequest[];
  loading: boolean;
  refreshing: boolean;
  load: (silent?: boolean) => Promise<void>;
  setAvailableOnline: (isAvailable: boolean) => Promise<void>;
};

const DoctorContext = createContext<DoctorContextValue | null>(null);

export function DoctorProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [available, setAvailable] = useState<ServiceRequest[]>([]);
  const [myServices, setMyServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [p, mine] = await Promise.all([
        apiFetch<{ data: DoctorProfile }>('/doctor/me'),
        apiFetch<{ data: ServiceRequest[] }>(`/services/doctor/me?_=${Date.now()}`),
      ]);
      setProfile(p.data);
      setMyServices(mine.data || []);
      if (p.data.isAvailable) {
        const pending = await apiFetch<{ data: ServiceRequest[] }>('/services/available');
        setAvailable(pending.data || []);
      } else {
        setAvailable([]);
      }
    } catch {
      // keep previous snapshot
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAvailable([]);
      setMyServices([]);
      setLoading(false);
      return;
    }
    load();
  }, [user, load]);

  useEffect(() => {
    if (!user || !profile?.isAvailable) return;
    const id = setInterval(() => load(true), 5000);
    return () => clearInterval(id);
  }, [user, profile?.isAvailable, load]);

  const setAvailableOnline = useCallback(
    async (isAvailable: boolean) => {
      const res = await apiFetch<{ data: DoctorProfile }>('/doctor/me/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      });
      setProfile((prev) => (prev ? { ...prev, ...res.data, isAvailable } : res.data));
      if (isAvailable) {
        const pending = await apiFetch<{ data: ServiceRequest[] }>('/services/available');
        setAvailable(pending.data || []);
      } else {
        setAvailable([]);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ profile, available, myServices, loading, refreshing, load, setAvailableOnline }),
    [profile, available, myServices, loading, refreshing, load, setAvailableOnline],
  );

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctor() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error('useDoctor debe usarse dentro de DoctorProvider');
  return ctx;
}
