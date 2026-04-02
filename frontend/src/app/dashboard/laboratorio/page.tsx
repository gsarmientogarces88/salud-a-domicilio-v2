'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLabDashboard } from '@/lib/laboratoryApi';

export default function LaboratorioDashboardPage() {
  const [data, setData] = useState<{ counts: Record<string, number>; laboratory: { name: string } } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLabDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const c = data?.counts;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          {data?.laboratory.name ? `Centro: ${data.laboratory.name}` : 'Resumen de solicitudes y seguimiento.'}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { key: 'pending', label: 'Pendientes', tone: 'bg-amber-50 text-amber-900 ring-amber-100' },
          { key: 'inReview', label: 'En revisión', tone: 'bg-sky-50 text-sky-900 ring-sky-100' },
          { key: 'quoted', label: 'Cotizadas', tone: 'bg-violet-50 text-violet-900 ring-violet-100' },
          { key: 'scheduled', label: 'Agendadas', tone: 'bg-teal-50 text-teal-900 ring-teal-100' },
          { key: 'resultsReady', label: 'Resultados listos', tone: 'bg-emerald-50 text-emerald-900 ring-emerald-100' },
        ].map((card) => (
          <div key={card.key} className={`rounded-2xl p-6 ring-1 ${card.tone}`}>
            <p className="text-sm font-semibold opacity-90">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{c?.[card.key] ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/laboratorio/solicitudes"
          className="inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Ver solicitudes
        </Link>
        <Link
          href="/dashboard/laboratorio/agenda"
          className="inline-flex rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Abrir agenda
        </Link>
      </div>
    </div>
  );
}
