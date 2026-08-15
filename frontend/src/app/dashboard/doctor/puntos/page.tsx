'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import MedicilioPuntosCard, { type LoyaltySummary } from '@/components/medico/MedicilioPuntosCard';

type HistoryRow = {
  id: string;
  date: string;
  type: string;
  concept: string;
  displayId: string;
  patientLabel: string | null;
  points: number;
  balanceAfter: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DoctorPuntosPage() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 30;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const [s, h] = await Promise.all([
        apiFetch<{ data: LoyaltySummary }>('/doctor/loyalty'),
        apiFetch<{ data: HistoryRow[]; total: number; page: number }>(
          `/doctor/loyalty/history?page=${p}&limit=${limit}`,
        ),
      ]);
      setSummary(s.data);
      setRows(h.data);
      setTotal(h.total);
      setPage(h.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar Medicilio Puntos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Fidelización</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Medicilio Puntos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Acumulas puntos por cada atención finalizada. Las metas se actualizan automáticamente.
        </p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading && !summary ? <p className="text-sm text-gray-500">Cargando…</p> : null}
      {summary ? <MedicilioPuntosCard summary={summary} compact /> : null}

      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">Historial de puntos</h2>
          <Link href="/dashboard/doctor" className="text-sm font-medium text-sky-700 hover:text-sky-900">
            Volver al dashboard
          </Link>
        </div>

        {rows.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">Aún no hay movimientos de puntos.</p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{row.concept}</p>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700">
                      {row.points > 0 ? `+${row.points}` : row.points}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(row.date)}</p>
                  {row.patientLabel ? (
                    <p className="mt-1 text-xs text-gray-600">Paciente: {row.patientLabel}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Atención #{row.displayId}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Saldo: {row.balanceAfter.toLocaleString('es-CL')}</p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium">Paciente / ID</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Puntos</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{formatDate(row.date)}</td>
                      <td className="px-3 py-2 text-xs text-gray-800">{row.concept}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {row.patientLabel || `#${row.displayId}`}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {row.type === 'VISIT_COMPLETED' ? 'Atención completada' : row.type}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-emerald-700">
                        {row.points > 0 ? `+${row.points}` : row.points}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-gray-700">
                        {row.balanceAfter.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-gray-500">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => void load(page + 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
