'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchPatientLabExams, getResultDownloadUrl } from '@/lib/labExamsApi';
import type { PatientLabExamRequestDto } from '@/lib/labExamTypes';
import { getLabApiStatusLabel, getLabApiStatusTone } from '@/lib/labExamStatusApi';
import { ExamStatusBadge } from '@/components/examenes/ExamStatusBadge';
import { getToken } from '@/lib/auth';

export interface PatientExamResultsProps {
  patientId: string;
}

type HistoryFilter = 'ALL' | 'PENDING' | 'QUOTED' | 'SCHEDULED' | 'RESULTS';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getSampleCollectedAt(request: PatientLabExamRequestDto) {
  return request.events.find((e) => e.kind === 'SAMPLE_COLLECTED')?.createdAt ?? null;
}

function getPrimaryPublishedResult(request: PatientLabExamRequestDto) {
  const published = request.results.filter((r) => r.published);
  if (published.length === 0) return null;
  return [...published].sort((a, b) => {
    const aTs = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTs = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTs - aTs;
  })[0];
}

function matchesFilter(request: PatientLabExamRequestDto, filter: HistoryFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'QUOTED') return request.status === 'QUOTED';
  if (filter === 'SCHEDULED') return ['LAB_SELECTED', 'SCHEDULED', 'SAMPLE_COLLECTED'].includes(request.status);
  if (filter === 'RESULTS') return ['RESULTS_READY', 'COMPLETED'].includes(request.status);
  return ['DRAFT', 'PENDING_QUOTES', 'EXPIRED', 'CANCELLED'].includes(request.status);
}

export default function PatientExamResults({ patientId: _patientId }: PatientExamResultsProps) {
  const [requests, setRequests] = useState<PatientLabExamRequestDto[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyResultId, setBusyResultId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPatientLabExams()
      .then((res) => {
        if (!active) return;
        setRequests(res.data);
        setError('');
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'No se pudo cargar el historial de exámenes.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (!matchesFilter(request, filter)) return false;
      if (!q) return true;
      const labName = request.selectedQuote?.laboratory?.name?.toLowerCase() || '';
      return request.examRequested.toLowerCase().includes(q) || labName.includes(q);
    });
  }, [requests, filter, search]);

  async function handleDownload(requestId: string, resultId: string, fileName: string) {
    const token = getToken();
    const url = getResultDownloadUrl(requestId, resultId);
    setBusyResultId(resultId);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo descargar');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = fileName || 'resultado.pdf';
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setError('No se pudo descargar el resultado. Intenta nuevamente.');
    } finally {
      setBusyResultId(null);
    }
  }

  async function handlePreview(requestId: string, resultId: string) {
    const token = getToken();
    const url = getResultDownloadUrl(requestId, resultId);
    setBusyResultId(resultId);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo abrir');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      window.open(href, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
    } catch {
      setError('No se pudo abrir el resultado. Intenta nuevamente.');
    } finally {
      setBusyResultId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-8 text-center">
        <p className="text-gray-600">Cargando historial de exámenes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'Pendientes' },
              { id: 'QUOTED', label: 'Cotizados' },
              { id: 'SCHEDULED', label: 'Agendados' },
              { id: 'RESULTS', label: 'Resultado disponible' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id as HistoryFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por examen o laboratorio"
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 lg:max-w-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-gray-600">
          No hay exámenes que coincidan con los filtros actuales.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((request) => {
            const appointment = request.appointments[0];
            const sampleCollectedAt = getSampleCollectedAt(request);
            const result = getPrimaryPublishedResult(request);
            const isPdf = result?.fileName?.toLowerCase().endsWith('.pdf');

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-sky-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Examen</p>
                    <h3 className="mt-1 text-base font-semibold text-gray-900">{request.examRequested}</h3>
                  </div>
                  <ExamStatusBadge tone={getLabApiStatusTone(request.status)} text={getLabApiStatusLabel(request.status)} />
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Laboratorio</p>
                    <p className="mt-1 font-medium text-gray-800">
                      {request.selectedQuote?.laboratory?.name ?? 'Pendiente de asignación'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cotización</p>
                    <p className="mt-1 font-medium text-gray-800">
                      {request.selectedQuote ? `$${request.selectedQuote.priceClp.toLocaleString('es-CL')} CLP` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha solicitud</p>
                    <p className="mt-1 text-gray-700">{formatDate(request.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha agendada</p>
                    <p className="mt-1 text-gray-700">{formatDate(appointment?.startAt || null)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha toma muestra</p>
                    <p className="mt-1 text-gray-700">{formatDate(sampleCollectedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha carga resultado</p>
                    <p className="mt-1 text-gray-700">{formatDate(result?.publishedAt || null)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Observaciones</p>
                  <p className="mt-1 text-sm text-gray-700">{result?.observations || request.observationsPatient || 'Sin observaciones.'}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!result || busyResultId === result.id}
                    onClick={() => result && handlePreview(request.id, result.id)}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ver resultado
                  </button>
                  <button
                    type="button"
                    disabled={!result || !isPdf || busyResultId === result.id}
                    onClick={() => result && handleDownload(request.id, result.id, result.fileName)}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Descargar PDF
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
