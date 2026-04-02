'use client';

import { useState, useEffect } from 'react';
import { getLabResultsByPatient, type LabExamResult } from '@/lib/homeExamsStore';

export interface PatientExamResultsProps {
  patientId: string;
}

function formatDate(iso: string) {
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

export default function PatientExamResults({ patientId }: PatientExamResultsProps) {
  const [results, setResults] = useState<LabExamResult[]>([]);

  useEffect(() => {
    setResults(getLabResultsByPatient(patientId));
  }, [patientId]);

  const handleDownload = (r: LabExamResult) => {
    if (r.fileDataUrl) {
      const a = document.createElement('a');
      a.href = r.fileDataUrl;
      a.download = r.fileName || 'resultado.pdf';
      a.click();
    }
  };

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No tienes resultados de exámenes cargados aún.</p>
        <p className="mt-2 text-sm text-gray-400">
          Cuando el laboratorio suba tus resultados, aparecerán aquí y podrás descargarlos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔬</span>
              <h3 className="font-semibold text-gray-900">{r.fileName || 'Resultado de examen'}</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Laboratorio: <span className="font-medium text-gray-700">{r.labName}</span>
            </p>
            <p className="text-sm text-gray-500">
              Fecha del examen: <span className="text-gray-700">{formatDate(r.examDate)}</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {r.fileDataUrl && (
              <button
                type="button"
                onClick={() => handleDownload(r)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Descargar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
