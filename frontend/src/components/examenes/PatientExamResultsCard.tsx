'use client';

import { useState } from 'react';
import type { LabResultApi } from '@/lib/labExamTypes';
import { getResultDownloadUrl } from '@/lib/labExamsApi';
import { getToken } from '@/lib/auth';

export default function PatientExamResultsCard({
  requestId,
  results,
}: {
  requestId: string;
  results: LabResultApi[];
}) {
  const [err, setErr] = useState('');
  const published = results.filter((r) => r.published);

  async function download(r: LabResultApi) {
    setErr('');
    const token = getToken();
    const url = getResultDownloadUrl(requestId, r.id);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo descargar');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = r.fileName || 'resultado.pdf';
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setErr('No se pudo descargar. Intenta de nuevo.');
    }
  }

  if (published.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
        <p className="text-sm font-semibold text-gray-900">Resultados</p>
        <p className="mt-1 text-sm text-gray-600">El laboratorio aún no publica tus resultados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl ring-1 ring-emerald-100">
          ✅
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Tus resultados están disponibles</p>
          <p className="mt-1 text-sm text-gray-600">Descarga los archivos (PDF o imagen).</p>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <ul className="mt-4 space-y-2">
            {published.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => download(r)}
                  className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Descargar: {r.fileName}
                </button>
                {r.observations && (
                  <p className="mt-1 text-xs text-gray-600">Nota: {r.observations}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
