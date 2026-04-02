'use client';

import Link from 'next/link';

export default function ExamResultReadyCard() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl ring-1 ring-emerald-100">
          ✅
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Tus resultados están disponibles</p>
          <p className="mt-1 text-sm text-gray-600">Puedes verlos y descargarlos desde tu sección de resultados.</p>
          <div className="mt-4">
            <Link
              href="/dashboard/patient/resultados-examenes"
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Ver resultados
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
