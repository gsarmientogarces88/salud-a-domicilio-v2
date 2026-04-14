'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLabRequests } from '@/lib/laboratoryApi';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_QUOTES: 'Pendiente de cotización',
  QUOTED: 'Cotizada',
  LAB_SELECTED: 'Elegida por paciente',
  SCHEDULED: 'Agendada',
  SAMPLE_COLLECTED: 'Muestra tomada',
  RESULTS_READY: 'Resultados listos',
  COMPLETED: 'Completada',
  EXPIRED: 'Sin cotizaciones',
  CANCELLED: 'Cancelada',
};

export default function LaboratorioSolicitudesPage() {
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLabRequests(filter || undefined)
      .then((r) => setList(r.data as any[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-gray-600">Gestiona cotizaciones, visitas y resultados.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.keys(STATUS_LABEL).map((k) => (
            <option key={k} value={k}>
              {STATUS_LABEL[k]}
            </option>
          ))}
        </select>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="grid gap-4">
        {list.map((row) => (
          <Link
            key={row.id}
            href={`/dashboard/laboratorio/solicitudes/${row.id}`}
            className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-teal-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{row.displayId}</p>
                <p className="mt-1 font-semibold text-gray-900">{row.patientName}</p>
                <p className="mt-1 text-sm text-gray-600">{row.examRequested}</p>
              </div>
              <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-100">
                {STATUS_LABEL[row.status] || row.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {row.commune} · {row.phone}
            </p>
          </Link>
        ))}
        {list.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-600">
            No hay solicitudes con este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
