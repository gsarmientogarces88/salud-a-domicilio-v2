'use client';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function ExamStatusBadge({ tone, text }: { tone: StatusTone; text: string }) {
  const cls =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700 ring-red-200'
          : tone === 'info'
            ? 'bg-sky-50 text-sky-700 ring-sky-200'
            : 'bg-gray-50 text-gray-700 ring-gray-200';

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>{text}</span>;
}
