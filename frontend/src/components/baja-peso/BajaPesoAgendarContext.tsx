'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AgendarModal from './AgendarModal';

type BajaPesoAgendarContextValue = {
  openAgendar: () => void;
  closeAgendar: () => void;
  isOpen: boolean;
};

const BajaPesoAgendarContext = createContext<BajaPesoAgendarContextValue | null>(null);

export function BajaPesoAgendarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAgendar = useCallback(() => setIsOpen(true), []);
  const closeAgendar = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ openAgendar, closeAgendar, isOpen }),
    [openAgendar, closeAgendar, isOpen],
  );

  return (
    <BajaPesoAgendarContext.Provider value={value}>
      {children}
      <AgendarModal isOpen={isOpen} onClose={closeAgendar} />
    </BajaPesoAgendarContext.Provider>
  );
}

export function useBajaPesoAgendar() {
  const ctx = useContext(BajaPesoAgendarContext);
  if (!ctx) {
    throw new Error('useBajaPesoAgendar debe usarse dentro de BajaPesoAgendarProvider');
  }
  return ctx;
}
