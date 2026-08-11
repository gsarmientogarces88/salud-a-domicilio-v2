'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PatientLabExamRequestDto } from '@/lib/labExamTypes';
import {
  acceptPatientQuote,
  cancelPatientLabExam,
  fetchPatientLabExam,
  rejectPatientQuote,
} from '@/lib/labExamsApi';

const POLL_MS = 20_000;

export function usePatientLabExam(requestId: string | null) {
  const [request, setRequest] = useState<PatientLabExamRequestDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!requestId) {
      setRequest(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchPatientLabExam(requestId);
      setRequest(res.data);
      setError('');
    } catch (e) {
      setRequest(null);
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!requestId) return;
    const needsPoll =
      request &&
      ['PENDING_QUOTES', 'QUOTED', 'LAB_SELECTED', 'SCHEDULED', 'SAMPLE_COLLECTED'].includes(
        request.status
      );
    if (!needsPoll) return;
    const t = window.setInterval(() => {
      refresh();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [requestId, request?.status, refresh]);

  const actions = useMemo(
    () => ({
      acceptQuote: async (quoteId: string) => {
        if (!requestId) return;
        const res = await acceptPatientQuote(requestId, quoteId);
        setRequest(res.data);
      },
      rejectQuote: async () => {
        if (!requestId) return;
        const res = await rejectPatientQuote(requestId);
        setRequest(res.data);
      },
      cancel: async (reason?: string) => {
        if (!requestId) return;
        const res = await cancelPatientLabExam(requestId, reason);
        setRequest(res.data);
      },
      refresh,
    }),
    [requestId, refresh]
  );

  return { request, error, loading, actions };
}
