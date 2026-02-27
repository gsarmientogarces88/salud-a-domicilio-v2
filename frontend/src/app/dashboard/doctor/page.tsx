'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

interface Service {
  id: string; type: string; status: string; description: string;
  address: string; commune?: string; totalAmount: number; doctorNetAmount: number;
  createdAt: string;
  patient?: { user: { firstName: string; lastName: string; phone?: string } };
}

export default function DoctorDashboard() {
  const [available, setAvailable] = useState<Service[]>([]);
  const [mine, setMine] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'mine'>('available');

  const load = async () => {
    try {
      const [avail, myServices] = await Promise.all([
        apiFetch<{ data: Service[] }>('/services/available'),
        apiFetch<{ data: Service[] }>('/services/me'),
      ]);
      setAvailable(avail.data);
      setMine(myServices.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const accept = async (id: string) => {
    try { await apiFetch(`/services/${id}/accept`, { method: 'POST' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/services/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const totalEarnings = mine
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.doctorNetAmount, 0);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      {/* Resumen ingresos */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Ingresos netos acumulados</p>
        <p className="text-3xl font-bold text-accent">${totalEarnings.toLocaleString('es-CL')} CLP</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('available')}
          className={`rounded-lg px-4 py-2 text-sm ${tab === 'available' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}>
          Disponibles ({available.length})
        </button>
        <button onClick={() => setTab('mine')}
          className={`rounded-lg px-4 py-2 text-sm ${tab === 'mine' ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}>
          Mis Atenciones ({mine.length})
        </button>
      </div>

      {/* Solicitudes disponibles */}
      {tab === 'available' && (
        <div className="space-y-3">
          {available.length === 0 ? (
            <p className="text-gray-500">No hay solicitudes disponibles.</p>
          ) : available.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <div>
                <span className="font-medium">{s.type === 'URGENT' ? '🚨' : '📅'} {s.description}</span>
                <p className="text-sm text-gray-500">{s.address}{s.commune ? `, ${s.commune}` : ''}</p>
                <p className="text-sm text-gray-400">${s.totalAmount.toLocaleString('es-CL')} CLP</p>
              </div>
              <button onClick={() => accept(s.id)}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90">
                ✅ Aceptar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mis atenciones */}
      {tab === 'mine' && (
        <div className="space-y-3">
          {mine.length === 0 ? (
            <p className="text-gray-500">No tienes atenciones aún.</p>
          ) : mine.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.description}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-gray-500">{s.address}</p>
                {s.patient && <p className="text-sm text-gray-400">{s.patient.user.firstName} {s.patient.user.lastName} {s.patient.user.phone ? `· ${s.patient.user.phone}` : ''}</p>}
                <p className="text-sm text-accent">Neto: ${s.doctorNetAmount.toLocaleString('es-CL')} CLP</p>
              </div>
              <div className="flex gap-2">
                {s.status === 'ACCEPTED' && (
                  <button onClick={() => changeStatus(s.id, 'IN_PROGRESS')}
                    className="rounded-lg bg-purple-500 px-3 py-2 text-sm text-white hover:opacity-90">
                    ▶️ Iniciar
                  </button>
                )}
                {s.status === 'IN_PROGRESS' && (
                  <button onClick={() => changeStatus(s.id, 'COMPLETED')}
                    className="rounded-lg bg-green-500 px-3 py-2 text-sm text-white hover:opacity-90">
                    ✅ Completar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
