'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Earning {
  id: string;
  createdAt: string;
  serviceRequestId: string;
  solicitante: string;
  amount: number;
  commissionAmount: number;
  doctorNetAmount: number;
  status: string;
}

export default function EarningsPage() {
  const [items, setItems] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Por ahora usamos service_requests como mock: en producción podría ser /doctor/earnings
      const res = await apiFetch<{ data: any[] }>('/services/doctor/me');
      const mapped: Earning[] = res.data.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        serviceRequestId: s.id,
        solicitante: s.patient?.user
          ? `${s.patient.user.firstName || ''} ${s.patient.user.lastName || ''}`.trim() || 'Solicitante'
          : 'Solicitante',
        amount: s.totalAmount,
        commissionAmount: s.commissionAmount ?? Math.round(s.totalAmount * 0.2),
        doctorNetAmount: s.doctorNetAmount,
        status: s.status === 'COMPLETED' ? 'PAGADO' : 'PENDIENTE',
      }));
      setItems(mapped);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const month = new Date().getMonth();
  const today = new Date().toISOString().split('T')[0];

  const monthItems = items.filter((e) => new Date(e.createdAt).getMonth() === month);
  const todayItems = items.filter((e) => e.createdAt.startsWith(today));
  const paid = items.filter((e) => e.status === 'PAGADO');
  const pending = items.filter((e) => e.status !== 'PAGADO');

  const sum = (arr: Earning[]) => arr.reduce((acc, e) => acc + e.doctorNetAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p className="text-sm text-gray-600">
            Revisa tus ingresos por atenciones y el estado de cada pago.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Ingresos del mes</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            ${sum(monthItems).toLocaleString('es-CL')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Ingresos de hoy</p>
          <p className="mt-2 text-2xl font-bold text-sky-600">
            ${sum(todayItems).toLocaleString('es-CL')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pendientes</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">
            ${sum(pending).toLocaleString('es-CL')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pagados</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            ${sum(paid).toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-sm text-gray-500">Cargando ingresos...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Aún no tienes ingresos registrados. Cuando completes tus primeras atenciones aparecerán
          aquí.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Solicitante</th>
                <th className="px-3 py-2">Bruto</th>
                <th className="px-3 py-2">Comisión</th>
                <th className="px-3 py-2">Neto</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {new Date(e.createdAt).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">{e.solicitante}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    ${e.amount.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    ${e.commissionAmount.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    ${e.doctorNetAmount.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        e.status === 'PAGADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

