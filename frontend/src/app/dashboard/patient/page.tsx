'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

interface Service {
  id: string; type: string; status: string; description: string;
  address: string; totalAmount: number; createdAt: string;
  doctor?: { user: { firstName: string; lastName: string } };
}

export default function PatientDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'URGENT', description: '', address: '', commune: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await apiFetch<{ data: Service[] }>('/services/me');
      setServices(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/services', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ type: 'URGENT', description: '', address: '', commune: '' });
      load();
    } catch (err: any) { setError(err.message); }
  };

  const handlePay = async (serviceId: string) => {
    try {
      await apiFetch(`/payments/${serviceId}/create`, { method: 'POST', body: JSON.stringify({ provider: 'mercadopago' }) });
      await apiFetch(`/payments/${serviceId}/confirm`, { method: 'POST', body: JSON.stringify({}) });
      load();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Solicitudes</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-dark">
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl bg-white p-6 shadow">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2">
            <option value="URGENT">🚨 Urgencia (tarifa fija)</option>
            <option value="SCHEDULED">📅 Agendada</option>
          </select>
          <input placeholder="Motivo de consulta" value={form.description} onChange={e => set('description', e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2" required />
          <input placeholder="Dirección" value={form.address} onChange={e => set('address', e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2" required />
          <input placeholder="Comuna" value={form.commune} onChange={e => set('commune', e.target.value)}
            className="mb-4 w-full rounded-lg border px-4 py-2" />
          <button type="submit" className="rounded-lg bg-accent px-6 py-2 text-white hover:opacity-90">
            Enviar Solicitud
          </button>
        </form>
      )}

      {services.length === 0 ? (
        <p className="text-gray-500">No tienes solicitudes aún.</p>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.type === 'URGENT' ? '🚨' : '📅'} {s.description}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-gray-500">{s.address} · ${s.totalAmount.toLocaleString('es-CL')} CLP</p>
                {s.doctor && <p className="text-sm text-gray-400">Dr. {s.doctor.user.firstName} {s.doctor.user.lastName}</p>}
              </div>
              {s.status === 'ACCEPTED' && (
                <button onClick={() => handlePay(s.id)}
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:opacity-90">
                  💳 Pagar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
