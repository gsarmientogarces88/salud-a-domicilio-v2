'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptExamQuote,
  addExamClarification,
  cancelExamRequest,
  getExamEventsByRequest,
  getExamQuoteByRequest,
  getExamRequestById,
  rejectExamQuote,
  tickMockExamRequest,
  type HomeExamQuote,
  type HomeExamRequest,
  type HomeExamRequestEvent,
} from '@/lib/homeExamsStore';

const DEFAULT_POLL_MS = 20_000;

export function useHomeExamRequest(requestId: string | null, pollMs: number = DEFAULT_POLL_MS) {
  const [request, setRequest] = useState<HomeExamRequest | null>(null);
  const [quote, setQuote] = useState<HomeExamQuote | null>(null);
  const [events, setEvents] = useState<HomeExamRequestEvent[]>([]);
  const [error, setError] = useState<string>('');

  const refresh = useCallback(() => {
    if (!requestId) return;
    try {
      const req = getExamRequestById(requestId);
      if (!req) {
        setRequest(null);
        setQuote(null);
        setEvents([]);
        return;
      }
      setRequest(req);
      setQuote(getExamQuoteByRequest(requestId));
      setEvents(getExamEventsByRequest(requestId));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la solicitud');
    }
  }, [requestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Polling: solo mientras el laboratorio puede cambiar el estado (mock).
   * Se detiene al llegar a QUOTED o estados finales; intervalos se limpian al desmontar.
   */
  useEffect(() => {
    if (!requestId) return;
    const ms = Math.max(pollMs, 15_000);

    const tick = () => {
      try {
        tickMockExamRequest(requestId);
      } catch {
        // ignore
      } finally {
        refresh();
      }
    };

    const t0 = window.setTimeout(tick, 400);

    const interval = window.setInterval(() => {
      const req = getExamRequestById(requestId);
      if (!req) return;
      if (req.status === 'PENDING' || req.status === 'UNDER_REVIEW') {
        tick();
      }
    }, ms);

    return () => {
      window.clearTimeout(t0);
      window.clearInterval(interval);
    };
  }, [requestId, pollMs, refresh]);

  const actions = useMemo(() => {
    return {
      acceptQuote: async () => {
        if (!requestId) return;
        try {
          acceptExamQuote(requestId);
          refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo aceptar la cotización');
        }
      },
      rejectQuote: async () => {
        if (!requestId) return;
        try {
          rejectExamQuote(requestId);
          refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo rechazar la cotización');
        }
      },
      requestClarification: async (message: string) => {
        if (!requestId) return;
        try {
          addExamClarification(requestId, message);
          refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo enviar la aclaración');
        }
      },
      cancel: async (reason?: string) => {
        if (!requestId) return;
        try {
          cancelExamRequest(requestId, reason);
          refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo cancelar la solicitud');
        }
      },
      refresh,
    };
  }, [refresh, requestId]);

  return { request, quote, events, error, actions };
}
