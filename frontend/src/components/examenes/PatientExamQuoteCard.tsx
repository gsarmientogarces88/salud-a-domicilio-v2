'use client';

import type { PatientLabExamRequestDto } from '@/lib/labExamTypes';
import { formatExamDateTime } from '@/components/examenes/examDateUtils';

export default function PatientExamQuoteCard({
  request,
  quote,
  onAccept,
  onReject,
  disabled,
}: {
  request: PatientLabExamRequestDto;
  quote: NonNullable<PatientLabExamRequestDto['quote']>;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-md ring-1 ring-amber-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cotización del laboratorio</h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{request.laboratory?.name ?? 'Laboratorio'}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-right ring-1 ring-sky-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Precio</p>
          <p className="text-2xl font-bold text-gray-900">${quote.priceClp.toLocaleString('es-CL')}</p>
          <p className="mt-0.5 text-xs text-gray-500">CLP</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Fecha propuesta (visita)</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {quote.proposedVisitAt ? formatExamDateTime(quote.proposedVisitAt) : 'A coordinar'}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Entrega de resultados</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {quote.estimatedResultsHours != null
              ? `~${quote.estimatedResultsHours} h desde la toma`
              : 'A definir'}
          </p>
        </div>
      </div>

      {quote.labObservations && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-sky-100">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Observaciones del laboratorio:</span>{' '}
            {quote.labObservations}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || request.status !== 'QUOTED'}
          onClick={onAccept}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          Aceptar cotización
        </button>
        <button
          type="button"
          disabled={disabled || request.status !== 'QUOTED'}
          onClick={onReject}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
