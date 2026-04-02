'use client';

import type { HomeExamRequestStatus } from '@/lib/homeExamsStore';
import { getHomeExamStatusLabel } from '@/lib/homeExamsStatus';

const ALL_STATUSES: HomeExamRequestStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'QUOTED',
  'QUOTE_ACCEPTED',
  'QUOTE_REJECTED',
  'SCHEDULED',
  'SAMPLE_COLLECTED',
  'RESULT_READY',
  'CANCELLED',
];

const HAPPY_PATH: HomeExamRequestStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'QUOTED',
  'QUOTE_ACCEPTED',
  'SCHEDULED',
  'SAMPLE_COLLECTED',
  'RESULT_READY',
];

function getRowState(
  current: HomeExamRequestStatus,
  row: HomeExamRequestStatus
): 'done' | 'current' | 'upcoming' {
  if (current === row) return 'current';

  if (current === 'CANCELLED') {
    return row === 'CANCELLED' ? 'current' : 'upcoming';
  }

  if (current === 'QUOTE_REJECTED') {
    if (row === 'PENDING' || row === 'UNDER_REVIEW' || row === 'QUOTED') return 'done';
    return 'upcoming';
  }

  const ci = HAPPY_PATH.indexOf(current);
  const ri = HAPPY_PATH.indexOf(row);

  if (ci >= 0 && ri >= 0 && ri < ci) return 'done';

  return 'upcoming';
}

export default function ExamRequestStatusCard({ currentStatus }: { currentStatus: HomeExamRequestStatus }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700">Estado de tu solicitud</h3>
      <p className="mt-1 text-sm text-gray-600">
        Avance del proceso. El paso resaltado es tu situación actual.
      </p>

      <ol className="mt-5 space-y-2">
        {ALL_STATUSES.map((status, idx) => {
          const state = getRowState(currentStatus, status);
          const isCurrent = state === 'current';
          const isDone = state === 'done';

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
                {isDone && !isCurrent ? '✓' : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-semibold ${
                    isCurrent ? 'text-gray-900' : isDone ? 'text-gray-800' : 'text-gray-500'
                  }`}
                >
                  {getHomeExamStatusLabel(status)}
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
