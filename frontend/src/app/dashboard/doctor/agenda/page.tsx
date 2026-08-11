'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  motivoOnly,
  pacienteInlineLabel,
  solicitanteLabel,
} from '@/lib/serviceParties';

interface Service {
  id: string;
  status: string;
  description: string;
  address: string;
  scheduledAt: string | null;
  createdAt?: string;
  telefono?: string | null;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  patient?: { user: { firstName: string; lastName: string } };
}

export default function AgendaPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Service[] }>('/services/doctor/me');
      setItems(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = items.reduce<Record<string, Service[]>>((acc, s) => {
    const d = s.scheduledAt
      ? new Date(s.scheduledAt)
      : new Date(s.createdAt ?? Date.now());
    const key = d.toISOString().split('T')[0];
    acc[key] = acc[key] || [];
    acc[key].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-600">
            Revisa tus atenciones agendadas y organiza tu día.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando agenda...</p>
      ) : sortedDates.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Aún no tienes atenciones agendadas. Cuando un paciente agende una hora, aparecerá aquí.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-800">
                {new Date(date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h2>
              <div className="space-y-2">
                {grouped[date].map((s) => {
                  const d = s.scheduledAt
                    ? new Date(s.scheduledAt)
                    : new Date(s.createdAt ?? Date.now());
                  const time = d.toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-sky-100 bg-salud-light/40 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {time} · {motivoOnly(s)}
                        </p>
                        <p className="text-xs text-gray-600">Solicitante: {solicitanteLabel(s)}</p>
                        <p className="text-xs text-gray-600">Paciente: {pacienteInlineLabel(s)}</p>
                        <p className="text-xs text-gray-600">📍 {s.address}</p>
                        {s.telefono ? (
                          <p className="text-xs text-gray-500">📞 {s.telefono}</p>
                        ) : null}
                      </div>
                      <a
                        href={`/dashboard/doctor/consultations/${s.id}`}
                        className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                      >
                        Ver detalle
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

