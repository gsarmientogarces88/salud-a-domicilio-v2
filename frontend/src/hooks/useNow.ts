'use client';

import { useEffect, useState } from 'react';

/**
 * Reloj compartido para UIs con countdown.
 * Actualiza `nowMs` en el intervalo indicado y limpia el timer al desmontar.
 */
export function useNow(tickMs = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);

  return nowMs;
}

