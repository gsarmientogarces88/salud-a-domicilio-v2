'use client';

import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';

type MilestoneHit = {
  pointsRequired: number;
  title: string;
  achievedAt: string;
};

type DoctorRow = {
  doctorId: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  completedVisitsCount: number;
  pointsBalance: number;
  level: { code: string; name: string };
  nextMilestone: { pointsRequired: number; title: string } | null;
  lastCompletedAt: string | null;
  milestones: MilestoneHit[];
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminFidelizacionPage() {
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async (p: number, query: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(limit),
      });
      if (query.trim()) params.set('q', query.trim());
      const res = await apiFetch<{ data: DoctorRow[]; total: number; page: number }>(
        `/admin/loyalty/doctors?${params.toString()}`,
      );
      setRows(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la fidelización');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, '');
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / limit));

  const search = (e: FormEvent) => {
    e.preventDefault();
    setAppliedQ(q);
    void load(1, q);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Fidelización Médicos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Consulta de Medicilio Puntos. Los puntos no se pueden modificar manualmente en esta etapa.
        </p>
      </header>

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o ID del médico"
          className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-4 text-sm outline-none ring-sky-200 focus:ring-2"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-xl bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Buscar
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Cargando…</p> : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Médico</th>
                <th className="px-4 py-3 font-medium">Atenciones</th>
                <th className="px-4 py-3 font-medium">Puntos</th>
                <th className="px-4 py-3 font-medium">Nivel</th>
                <th className="px-4 py-3 font-medium">Próxima meta</th>
                <th className="px-4 py-3 font-medium">Última atención</th>
                <th className="px-4 py-3 font-medium">Metas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = openId === row.doctorId;
                return (
                  <Fragment key={row.doctorId}>
                    <tr className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500">{row.email}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">{row.doctorId}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.completedVisitsCount.toLocaleString('es-CL')}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {row.pointsBalance.toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                          {row.level.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {row.nextMilestone
                          ? row.nextMilestone.pointsRequired.toLocaleString('es-CL')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDate(row.lastCompletedAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : row.doctorId)}
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                        >
                          {open ? 'Ocultar' : `${row.milestones.length} alcanzada(s)`}
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="px-4 py-3">
                          {row.milestones.length === 0 ? (
                            <p className="text-xs text-gray-500">Aún no alcanza metas.</p>
                          ) : (
                            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {row.milestones.map((m) => (
                                <li
                                  key={`${row.doctorId}-${m.pointsRequired}`}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                >
                                  <p className="font-semibold text-gray-800">{m.title}</p>
                                  <p className="mt-0.5 text-gray-500">Alcanzada: {formatDate(m.achievedAt)}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !loading ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            {appliedQ ? 'No hay médicos que coincidan con la búsqueda.' : 'No hay médicos registrados.'}
          </p>
        ) : null}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1, appliedQ)}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">
            {page} / {pages} · {total} médicos
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => void load(page + 1, appliedQ)}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
