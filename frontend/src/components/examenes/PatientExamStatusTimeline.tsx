'use client';

import type { LabExamRequestStatusApi } from '@/lib/labExamTypes';
import { getLabApiStatusLabel } from '@/lib/labExamStatusApi';

const FLOW: LabExamRequestStatusApi[] = [
  'PENDING',
  'IN_REVIEW',
  'QUOTED',
  'PATIENT_ACCEPTED',
  'SCHEDULED',
  'SAMPLE_COLLECTED',
  'RESULTS_READY',
  'COMPLETED',
];

function stepIndex(
  current: LabExamRequestStatusApi
): 'branch' | number {
  if (current === 'REJECTED' || current === 'CANCELLED') return 'branch';
  const i = FLOW.indexOf(current);
  return i >= 0 ? i : 0;
}

export default function PatientExamStatusTimeline({ currentStatus }: { currentStatus: LabExamRequestStatusApi }) {
  const branch = stepIndex(currentStatus);

  if (branch === 'branch') {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">Estado de tu solicitud</h3>
        <p className="mt-2 text-sm text-gray-700">
          {currentStatus === 'REJECTED'
            ? 'El laboratorio rechazó esta solicitud. Puedes iniciar una nueva cuando corresponda.'
            : 'Esta solicitud fue cancelada.'}
        </p>
      </div>
    );
  }

  const idx = branch as number;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">Estado de tu solicitud</h3>
      <p className="mt-1 text-sm text-gray-600">Avance del proceso con el laboratorio.</p>

      <ol className="mt-5 space-y-2">
        {FLOW.map((status, i) => {
          const isDone = i < idx;
          const isCurrent = i === idx;
          const box = isCurrent
            ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200/80'
            : isDone
              ? 'border-emerald-100 bg-emerald-50/50'
              : 'border-gray-100 bg-gray-50/60';

          return (
            <li
              key={status}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${box}`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? 'bg-sky-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
                aria-hidden
              >
                {isDone && !isCurrent ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-semibold ${
                    isCurrent ? 'text-gray-900' : isDone ? 'text-gray-800' : 'text-gray-500'
                  }`}
                >
                  {getLabApiStatusLabel(status)}
                </p>
                {isCurrent && <p className="mt-0.5 text-xs font-medium text-sky-700">Paso actual</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
