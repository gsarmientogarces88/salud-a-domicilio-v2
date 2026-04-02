'use client';

import { useAuth } from '@/context/AuthContext';
import MedicalServiceLanding from '@/components/medico/MedicalServiceLanding';

export default function MedicoPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">📋</span>
            Pedir Médico a Domicilio
          </h1>
          <p className="text-gray-600">
            Elige cómo deseas solicitar tu consulta médica a domicilio.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 hover:bg-gray-100">
            <span className="text-xl">🔔</span>
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              1
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-sky-200 text-center leading-10 text-sky-700">
              👤
            </span>
          </div>
        </div>
      </div>

      <MedicalServiceLanding />

      <div className="mt-8 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          Podrás pagar con Bono de Isapre o en línea tras confirmar disponibilidad del doctor.{' '}
          <a href="#" className="font-medium text-sky-600 hover:underline">
            Ve cómo funciona →
          </a>
        </p>
      </div>
    </div>
  );
}
