'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; isBanned: boolean; cancellationCount: number; }
interface Service { id: string; type: string; status: string; description: string; totalAmount: number; commissionAmount: number; createdAt: string; }

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tab, setTab] = useState<'users' | 'services' | 'config'>('users');
  const [cfg, setCfg] = useState({ percentage: 20, pendingTimeoutSec: 240, maxCancellations: 3 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [u, s] = await Promise.all([
        apiFetch<{ data: User[] }>('/admin/users'),
        apiFetch<{ data: Service[] }>('/admin/services'),
      ]);
      setUsers(u.data);
      setServices(s.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleBan = async (id: string, banned: boolean) => {
    try {
      await apiFetch(`/admin/users/${id}/${banned ? 'unban' : 'ban'}`, { method: 'PATCH', body: JSON.stringify({}) });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const updateCfg = async (endpoint: string, body: object) => {
    try {
      await apiFetch(`/admin/commission${endpoint}`, { method: 'PATCH', body: JSON.stringify(body) });
      alert('Actualizado ✅');
    } catch (e: any) { alert(e.message); }
  };

  const totalRevenue = services.filter(s => s.status === 'COMPLETED').reduce((a, s) => a + s.totalAmount, 0);
  const totalCommission = services.filter(s => s.status === 'COMPLETED').reduce((a, s) => a + s.commissionAmount, 0);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      {/* Métricas */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Ingresos totales</p>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString('es-CL')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Comisiones</p>
          <p className="text-2xl font-bold text-accent">${totalCommission.toLocaleString('es-CL')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Solicitudes</p>
          <p className="text-2xl font-bold">{services.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {(['users', 'services', 'config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === t ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}>
            {t === 'users' ? '👥 Usuarios' : t === 'services' ? '🩺 Servicios' : '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* Usuarios */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
              <div>
                <span className="font-medium">{u.firstName} {u.lastName}</span>
                <span className="ml-2 text-xs text-gray-400">{u.role}</span>
                {u.isBanned && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">BANEADO</span>}
                <p className="text-sm text-gray-500">{u.email} · Cancelaciones: {u.cancellationCount}</p>
              </div>
              <button onClick={() => toggleBan(u.id, u.isBanned)}
                className={`rounded px-3 py-1 text-sm text-white ${u.isBanned ? 'bg-green-500' : 'bg-red-500'}`}>
                {u.isBanned ? 'Desbanear' : 'Banear'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Servicios */}
      {tab === 'services' && (
        <div className="space-y-2">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.type === 'URGENT' ? '🚨' : '📅'} {s.description}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-gray-500">Total: ${s.totalAmount.toLocaleString('es-CL')} · Comisión: ${s.commissionAmount.toLocaleString('es-CL')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config */}
      {tab === 'config' && (
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-500">Comisión (%)</label>
              <input type="number" value={cfg.percentage} onChange={e => setCfg(p => ({ ...p, percentage: +e.target.value }))}
                className="w-full rounded-lg border px-4 py-2" />
            </div>
            <button onClick={() => updateCfg('', { percentage: cfg.percentage })}
              className="rounded-lg bg-primary px-4 py-2 text-white">Guardar</button>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-500">Timeout (segundos)</label>
              <input type="number" value={cfg.pendingTimeoutSec} onChange={e => setCfg(p => ({ ...p, pendingTimeoutSec: +e.target.value }))}
                className="w-full rounded-lg border px-4 py-2" />
            </div>
            <button onClick={() => updateCfg('/timeout', { pendingTimeoutSec: cfg.pendingTimeoutSec })}
              className="rounded-lg bg-primary px-4 py-2 text-white">Guardar</button>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-500">Máx cancelaciones antes de ban</label>
              <input type="number" value={cfg.maxCancellations} onChange={e => setCfg(p => ({ ...p, maxCancellations: +e.target.value }))}
                className="w-full rounded-lg border px-4 py-2" />
            </div>
            <button onClick={() => updateCfg('/max-cancellations', { maxCancellations: cfg.maxCancellations })}
              className="rounded-lg bg-primary px-4 py-2 text-white">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
