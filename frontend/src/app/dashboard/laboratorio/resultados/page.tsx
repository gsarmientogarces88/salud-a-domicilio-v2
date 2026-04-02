'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLabRequests } from '@/lib/laboratoryApi';

export default function LaboratorioResultadosPage() {
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLabRequests('RESULTS_READY')
      .then((r) => setList(r.data as any[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        <p className="text-gray-600">Solicitudes con resultados publicados o pendientes de cierre.</p>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="grid gap-4">
        {list.map((row) => (
          <Link
            key={row.id}
            href={`/dashboard/laboratorio/solicitudes/${row.id}`}
            className="block rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 ring-1 ring-emerald-100 hover:ring-2"
          >
            <p className="text-xs font-semibold uppercase text-emerald-800">{row.displayId}</p>
            <p className="mt-1 font-semibold text-gray-900">{row.patientName}</p>
            <p className="mt-1 text-sm text-gray-700">{row.examRequested}</p>
            <p className="mt-2 text-xs text-gray-600">
              Archivos: {(row.results || []).filter((x: any) => x.published).length} publicado(s)
            </p>
          </Link>
        ))}
        {list.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-600">
            No hay solicitudes en estado resultados listos.
          </p>
        )}
      </div>
    </div>
  );
}
