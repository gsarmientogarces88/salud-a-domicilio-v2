'use client';

import type { PatientLabExamRequestDto } from '@/lib/labExamTypes';
import { getLabApiStatusLabel, getLabApiStatusTone } from '@/lib/labExamStatusApi';
import { ExamStatusBadge } from '@/components/examenes/ExamStatusBadge';
import { formatExamDateTime } from '@/components/examenes/examDateUtils';

export default function PatientExamSummary({ request }: { request: PatientLabExamRequestDto }) {
  const label = getLabApiStatusLabel(request.status);
  const tone = getLabApiStatusTone(request.status);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <p className="text-sm font-semibold text-emerald-800">Solicitud registrada</p>
        <p className="mt-1 text-xs text-emerald-700/90">
          Seguimiento en tiempo real. Verás cotización, fecha propuesta y resultados aquí.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Identificador</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">#{request.displayId}</h3>
            <p className="mt-2 text-sm text-gray-600">
              Creada:{' '}
              <span className="font-medium text-gray-800">{formatExamDateTime(request.createdAt)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Última actualización:{' '}
              <span className="font-medium text-gray-800">{formatExamDateTime(request.updatedAt)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado actual</p>
            <div className="mt-2 flex justify-end">
              <ExamStatusBadge tone={tone} text={label} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Exámenes solicitados</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{request.examRequested}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Laboratorio</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{request.selectedQuote?.laboratory?.name ?? 'Pendiente de selección'}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Dirección</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{request.address}</p>
            <p className="mt-1 text-sm text-gray-600">{request.commune}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Contacto</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{request.phone}</p>
            <p className="mt-1 text-sm text-gray-600">{request.email}</p>
            {request.preferredTimeRange && (
              <p className="mt-1 text-sm text-gray-600">
                Preferencia: {request.preferredDate ? formatExamDateTime(request.preferredDate) : 'Sin fecha'} · {request.preferredTimeRange}
              </p>
            )}
          </div>
        </div>

        {request.observationsPatient && (
          <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Observaciones</p>
            <p className="mt-1 text-sm text-gray-700">{request.observationsPatient}</p>
          </div>
        )}

        {request.labRejectionReason && (
          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-800">Motivo de rechazo (laboratorio)</p>
            <p className="mt-1 text-sm text-red-900">{request.labRejectionReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
