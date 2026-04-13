'use client';

import { useState } from 'react';
import UrgentRequestModal from './UrgentRequestModal';
import SymptomsInfo from './symptoms-info';

export default function MedicalServiceLanding() {
  const [showUrgentModal, setShowUrgentModal] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
      {/* Fondo con patrón */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #7dd3fc 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, #bae6fd 0%, transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        {/* Ilustración médico */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-5xl">
            👨‍⚕️
          </div>
        </div>

        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Consulta a Domicilio con Médico
        </h2>
        <p className="mb-6 text-center text-gray-600">
          Un médico general atenderá en tu hogar por síntomas comunes y urgencias leves.
        </p>

        <SymptomsInfo />

        {/* Urgencia inmediata (agenda programada: menú Agenda Médico a Domicilio) */}
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border-2 border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-green-50 text-3xl">
              ⏱️
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Pedir Médico Ahora (Rápido)</h3>
            <p className="mb-4 text-sm text-gray-600">
              Consigue un doctor lo antes posible
            </p>
            <button
              type="button"
              onClick={() => setShowUrgentModal(true)}
              className="w-full rounded-xl bg-green-500 py-4 font-semibold text-white shadow-md transition-all hover:bg-green-600 hover:shadow-lg"
            >
              Pedir médico ahora
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-sm text-green-600">
              ✓ Médico en 15 minutos aprox.
            </p>
          </div>
        </div>
      </div>

      <UrgentRequestModal isOpen={showUrgentModal} onClose={() => setShowUrgentModal(false)} />
    </div>
  );
}
