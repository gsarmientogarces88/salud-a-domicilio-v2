'use client';

export default function ExamWaitingCard() {
  return (
    <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/80 p-6 shadow-sm ring-1 ring-sky-100">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl ring-1 ring-sky-200">
          🔎
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Estamos revisando tu orden médica</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Te mostraremos la cotización aquí mismo apenas esté disponible.{' '}
            <span className="font-medium text-gray-800">No es necesario ir a otra página ni recargar:</span> esta vista se
            actualiza sola.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Tiempo estimado de respuesta del laboratorio:</span> 15 a 60
            minutos hábiles (puede variar según carga y complejidad de la orden).
          </p>
        </div>
      </div>
    </div>
  );
}
