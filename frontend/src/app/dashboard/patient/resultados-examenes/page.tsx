'use client';

import { useAuth } from '@/context/AuthContext';
import PatientExamResults from '@/components/examenes/PatientExamResults';

export default function ResultadosExamenesPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Exámenes</h1>
        <p className="mt-1 text-gray-600">
          Revisa todas tus solicitudes de exámenes, su estado, fechas clave y resultados disponibles.
        </p>
      </div>
      <PatientExamResults patientId={user.id} />
    </div>
  );
}
