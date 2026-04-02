'use client';

import { useAuth } from '@/context/AuthContext';
import ExamsHomePageSection from '@/components/examenes/ExamsHomePageSection';

/**
 * Vista dedicada: Exámenes a Domicilio (independiente de "Solicitar consulta").
 * Futuro: listar historial (Pending, Quoted, Accepted, Completed) desde API.
 */
export default function ExamenesDomicilioPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <h1 className="mb-2 flex flex-wrap items-center gap-3 text-2xl font-bold text-gray-900">
          <span className="text-3xl" aria-hidden>
            🧪
          </span>
          Exámenes a Domicilio
        </h1>
        <p className="max-w-2xl text-gray-600">
          Sube tu orden médica, ingresa tus datos, espera la cotización y acepta o rechaza sin salir de esta vista.
        </p>
      </header>

      <ExamsHomePageSection
        patientId={user.id}
        patientName={`${user.firstName} ${user.lastName}`}
        variant="standalone"
      />

      <section className="mt-10 rounded-2xl border border-sky-100 bg-white px-5 py-6 shadow-sm ring-1 ring-sky-50">
        <h2 className="text-sm font-semibold text-sky-900">Historial</h2>
        <p className="mt-2 text-sm text-gray-600">
          Las solicitudes anteriores quedan en el sistema; usa <span className="font-medium">Nueva solicitud</span>{' '}
          arriba para iniciar otro trámite sin perder el seguimiento del actual.
        </p>
      </section>
    </div>
  );
}
