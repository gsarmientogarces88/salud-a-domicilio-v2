'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchLabCalendar, postBlockedSlot, deleteBlockedSlot } from '@/lib/laboratoryApi';

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default function LaboratorioAgendaPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [data, setData] = useState<{ appointments: any[]; blocked: any[] } | null>(null);
  const [error, setError] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('13:00');

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [cursor]);

  const load = () =>
    fetchLabCalendar(range.from, range.to)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));

  useEffect(() => {
    load();
  }, [range.from, range.to]);

  const sorted = useMemo(() => {
    return [...(data?.appointments || [])].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [data]);

  const title = cursor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Visitas del mes y bloqueos.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Siguiente →
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold capitalize text-gray-900">{title}</h2>
        <ul className="mt-4 divide-y divide-gray-100">
          {sorted.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(a.startAt).toLocaleString('es-CL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-sm text-gray-600">{a.request?.patientName || 'Paciente'}</p>
                <p className="text-xs text-gray-500">{a.request?.displayNumber}</p>
              </div>
              <Link
                href={`/dashboard/laboratorio/solicitudes/${a.request?.id}`}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Ver solicitud
              </Link>
            </li>
          ))}
        </ul>
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No hay visitas en este mes.</p>
        )}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Bloquear horario</h2>
        <p className="mt-1 text-sm text-gray-600">Franjas no disponibles para coordinación.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!blockDate}
            onClick={async () => {
              if (!blockDate) return;
              await postBlockedSlot({ date: blockDate, startTime: blockStart, endTime: blockEnd });
              await load();
            }}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            Guardar bloqueo
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          {(data?.blocked || []).map((b: any) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <span>
                {new Date(b.date).toLocaleDateString('es-CL')} {b.startTime}–{b.endTime}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:underline"
                onClick={async () => {
                  await deleteBlockedSlot(b.id);
                  await load();
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
