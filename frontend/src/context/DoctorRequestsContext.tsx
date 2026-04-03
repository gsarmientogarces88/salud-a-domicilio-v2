'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { playBell, registerBellUnlockListeners } from '@/lib/playBell';

export const DOCTOR_REQUESTS_PATH = '/dashboard/doctor/requests';
const POLL_MS = 5000;

export interface DoctorAvailableRequestItem {
  id: string;
  type: string;
  status: string;
  description: string;
  address: string;
  commune?: string | null;
  city?: string | null;
  telefono?: string | null;
  referencias?: string | null;
  totalAmount: number;
  createdAt: string;
  expiresAt?: string | null;
  patient?: { user: { firstName: string; lastName: string } };
  requestLat?: number | null;
  requestLng?: number | null;
  distanceKm?: number | null;
  remainingSeconds?: number | null;
}

export type DoctorRequestsContextValue = {
  enabled: boolean;
  isAvailable: boolean | null;
  pendingCount: number;
  shouldBlinkRequestsNav: boolean;
  availableItems: DoctorAvailableRequestItem[];
  loading: boolean;
  /** `silent`: no spinner (útil para polling). */
  refresh: (silent?: boolean) => Promise<void>;
};

const defaultValue: DoctorRequestsContextValue = {
  enabled: false,
  isAvailable: null,
  pendingCount: 0,
  shouldBlinkRequestsNav: false,
  availableItems: [],
  loading: false,
  refresh: async () => {},
};

const DoctorRequestsContext = createContext<DoctorRequestsContextValue>(defaultValue);

export function useDoctorRequests(): DoctorRequestsContextValue {
  return useContext(DoctorRequestsContext);
}

function DoctorRequestsProviderDoctor({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availableItems, setAvailableItems] = useState<DoctorAvailableRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const seenIdsBaselineDone = useRef(false);
  const previousIdsRef = useRef<Set<string>>(new Set());

  const isOnRequestsSection = pathname === DOCTOR_REQUESTS_PATH;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const me = await apiFetch<{ data: { isAvailable: boolean } }>('/doctor/me');
      const available = me.data.isAvailable;
      setIsAvailable(available);

      if (!available) {
        setAvailableItems([]);
        seenIdsBaselineDone.current = false;
        previousIdsRef.current = new Set();
        return;
      }

      const res = await apiFetch<{ data: DoctorAvailableRequestItem[] }>('/services/available');
      const list = res.data ?? [];
      const nextIds = new Set(list.map((x) => x.id));

      if (seenIdsBaselineDone.current) {
        const prev = previousIdsRef.current;
        const newlyArrived = list.filter((x) => !prev.has(x.id));
        if (newlyArrived.length > 0) {
          playBell();
        }
      } else {
        seenIdsBaselineDone.current = true;
      }

      previousIdsRef.current = nextIds;
      setAvailableItems(list);
    } catch {
      /* mantiene último estado útil */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const removeUnlock = registerBellUnlockListeners();
    void refresh(false);
    const id = window.setInterval(() => {
      void refresh(true);
    }, POLL_MS);
    return () => {
      removeUnlock();
      window.clearInterval(id);
    };
  }, [refresh]);

  const pendingCount = isAvailable ? availableItems.length : 0;

  const shouldBlinkRequestsNav =
    Boolean(isAvailable) && pendingCount > 0 && !isOnRequestsSection;

  const value = useMemo<DoctorRequestsContextValue>(
    () => ({
      enabled: true,
      isAvailable,
      pendingCount,
      shouldBlinkRequestsNav,
      availableItems,
      loading,
      refresh,
    }),
    [isAvailable, pendingCount, shouldBlinkRequestsNav, availableItems, loading, refresh]
  );

  return <DoctorRequestsContext.Provider value={value}>{children}</DoctorRequestsContext.Provider>;
}

export function DoctorRequestsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'DOCTOR') {
    return <>{children}</>;
  }
  return <DoctorRequestsProviderDoctor>{children}</DoctorRequestsProviderDoctor>;
}
