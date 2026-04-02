'use client';

import { useEffect, useState } from 'react';

export default function DoctorMetricsPage() {
  const [loading, setLoading] = useState(false);

  // Mock metrics por ahora
  const metrics = {
    acceptanceRate: 0.9,
    cancellations: 2,
    avgArrival: 15,
    avgRating: 4.8,
    recurrentPatients: 5,
  };

  useEffect(() => {
    // En el futuro: apiFetch('/doctor/metrics')
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        <p className="text-sm text-gray-600">
          Revisa tu desempeño en la plataforma. Estos datos te ayudan a mejorar tu servicio.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando métricas...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Tasa de aceptación</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {(metrics.acceptanceRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Cancelaciones</p>
              <p className="mt-2 text-2xl font-bold text-red-500">{metrics.cancellations}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Tiempo promedio llegada</p>
              <p className="mt-2 text-2xl font-bold text-gray-800">
                {metrics.avgArrival}
                <span className="ml-1 text-sm font-normal text-gray-500">min</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Rating promedio</p>
              <p className="mt-2 text-2xl font-bold text-yellow-500">
                {metrics.avgRating.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-gray-500">/ 5</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Pacientes recurrentes</p>
              <p className="mt-2 text-2xl font-bold text-sky-600">{metrics.recurrentPatients}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Badges</h2>
            <p className="mb-4 text-xs text-gray-500">
              Los badges se asignan automáticamente según tu actividad y evaluación.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                💼 Médico Activo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                ⭐ Médico Destacado
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                🏆 Top Médico del Mes
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

