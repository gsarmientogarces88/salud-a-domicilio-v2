'use client';

export default function ExamRequestTimeline({
  items,
}: {
  items: { title: string; date?: string; subtitle?: string }[];
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sky-700">Historial</h3>
      <div className="space-y-4">
        {items.map((it, idx) => (
          <div key={`${it.title}-${idx}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-600" />
              {idx < items.length - 1 && <div className="mt-1 min-h-[1.25rem] w-px flex-1 bg-sky-100" />}
            </div>
            <div className="min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-gray-900">{it.title}</p>
                {it.date && <span className="text-xs text-gray-500">{it.date}</span>}
              </div>
              {it.subtitle && <p className="mt-1 text-sm text-gray-600">{it.subtitle}</p>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">Aún no hay eventos para mostrar.</p>}
      </div>
    </div>
  );
}
