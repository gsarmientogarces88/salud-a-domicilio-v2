'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

interface Service {
  id: string;
  status: string;
  description: string;
  address: string;
  doctorNetAmount: number;
  createdAt: string;
  patient?: { user: { firstName: string; lastName: string } };
}

type TabKey = 'ACTIVE' | 'COMPLETED' | 'CANCELED';

const TAB_STATUSES: Record<TabKey, string[]> = {
  ACTIVE: ['IN_PROGRESS', 'QUEUED', 'ACCEPTED'],
  COMPLETED: ['COMPLETED'],
  CANCELED: ['CANCELLED'],
};

export default function MyConsultationsPage() {
  const [tab, setTab] = useState<TabKey>('ACTIVE');
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);

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

  const filtered = items.filter((s) => TAB_STATUSES[tab].includes(s.status));
  const active = filtered.find((s) => s.status === 'IN_PROGRESS') || null;
  const queued = filtered.find((s) => s.status === 'QUEUED') || null;

  const finishActive = async () => {
    if (!active) return;
    const ok = window.confirm('¿Finalizar atención activa?');
    if (!ok) return;
    setFinishingId(active.id);
    try {
      await apiFetch(`/services/${active.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await load();
    } catch (e: any) {
      alert(e.message || 'No se pudo finalizar la atención.');
    } finally {
      setFinishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis atenciones</h1>
          <p className="text-sm text-gray-600">
            Revisa tus atenciones en curso, finalizadas y canceladas.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Actualizar
        </button>
      </div>

      <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
        {([
          { key: 'ACTIVE', label: 'En curso' },
          { key: 'COMPLETED', label: 'Finalizadas' },
          { key: 'CANCELED', label: 'Canceladas' },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-sky-600 text-white' : 'bg-transparent text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando atenciones...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          No hay atenciones en esta categoría todavía.
        </p>
      ) : (
        <div className="space-y-4">
          {tab === 'ACTIVE' && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="text-xs font-semibold text-gray-700">Servicio activo</p>
                {active ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={active.status} />
                      <span className="text-sm font-semibold text-gray-900">
                        {active.patient ? `${active.patient.user.firstName} ${active.patient.user.lastName}` : 'Paciente'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{active.description}</p>
                    <p className="mt-1 text-xs text-gray-500">📍 {active.address}</p>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={`/dashboard/doctor/consultations/${active.id}`}
                        className="rounded-lg bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        Ver detalle
                      </a>
                      <button
                        onClick={finishActive}
                        disabled={finishingId === active.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
                      >
                        {finishingId === active.id ? 'Finalizando…' : 'Finalizar atención'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No tienes una atención activa.</p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="text-xs font-semibold text-gray-700">Próximo en cola</p>
                {queued ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={queued.status} />
                      <span className="text-sm font-semibold text-gray-900">
                        {queued.patient ? `${queued.patient.user.firstName} ${queued.patient.user.lastName}` : 'Paciente'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{queued.description}</p>
                    <p className="mt-1 text-xs text-gray-500">📍 {queued.address}</p>
                    <div className="mt-3">
                      <a
                        href={`/dashboard/doctor/consultations/${queued.id}`}
                        className="rounded-lg bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        Ver detalle / Chat
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No tienes servicios en espera.</p>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {new Date(s.createdAt).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {s.patient ? `${s.patient.user.firstName} ${s.patient.user.lastName}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{s.description}</td>
                  <td className="px-3 py-2 text-xs">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    ${s.doctorNetAmount.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <a
                      href={`/dashboard/doctor/consultations/${s.id}`}
                      className="rounded-lg bg-sky-50 px-3 py-1 font-medium text-sky-700 hover:bg-sky-100"
                    >
                      Ver detalle
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

