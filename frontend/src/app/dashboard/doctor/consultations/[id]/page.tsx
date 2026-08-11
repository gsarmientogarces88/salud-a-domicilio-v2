'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import ServiceRequestChat from '@/components/chat/ServiceRequestChat';
import {
  motivoOnly,
  pacienteAtendidoLabel,
  solicitanteLabel,
} from '@/lib/serviceParties';

type ServiceRequest = {
  id: string;
  status: string;
  description: string;
  address: string;
  createdAt: string;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  patient?: { user: { firstName: string; lastName: string; phone?: string | null } };
  doctor?: { user: { firstName: string; lastName: string; phone?: string | null } } | null;
};

export default function DoctorConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ServiceRequest }>(`/services/${id}`);
      setSr(res.data);
    } catch (e: any) {
      alert(e?.message || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const finishAttention = async () => {
    if (!sr || sr.status !== 'IN_PROGRESS') return;
    const ok = window.confirm('¿Confirmas que finalizaste la atención?');
    if (!ok) return;
    setFinishing(true);
    try {
      await apiFetch(`/services/${sr.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'No se pudo finalizar la atención.');
    } finally {
      setFinishing(false);
    }
  };

  const startAttention = async () => {
    if (!sr || (sr.status !== 'ACCEPTED' && sr.status !== 'QUEUED')) return;
    const ok = window.confirm('¿Iniciar la atención en el domicilio del paciente?');
    if (!ok) return;
    setStarting(true);
    try {
      await apiFetch(`/services/${sr.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'No se pudo iniciar la atención.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Cargando…</p>;
  if (!sr) return <p className="text-sm text-gray-500">No encontrada.</p>;

  const chatEnabled = ['ACCEPTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETED'].includes(sr.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atención</h1>
          <p className="text-sm text-gray-600">Detalle y coordinación con el paciente.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {sr.status === 'IN_PROGRESS' ? (
            <button
              type="button"
              onClick={finishAttention}
              disabled={finishing}
              className="min-h-[52px] w-full touch-manipulation rounded-2xl bg-emerald-600 px-5 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:bg-gray-300 sm:w-auto"
            >
              {finishing ? 'Finalizando…' : 'FINALIZAR ATENCIÓN'}
            </button>
          ) : null}
          {sr.status === 'ACCEPTED' || sr.status === 'QUEUED' ? (
            <button
              type="button"
              onClick={startAttention}
              disabled={starting}
              className="min-h-[52px] w-full touch-manipulation rounded-2xl bg-sky-600 px-5 py-3 text-base font-bold text-white hover:bg-sky-700 disabled:bg-gray-300 sm:w-auto"
            >
              {starting ? 'Iniciando…' : 'INICIAR ATENCIÓN'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={load}
            className="min-h-[44px] w-full touch-manipulation rounded-xl bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-200 sm:w-auto"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={sr.status} />
          <span className="text-xs text-gray-500">
            {new Date(sr.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Solicitante</p>
            <p className="text-sm font-semibold text-gray-900">
              {solicitanteLabel(sr)}
              {sr.edadPaciente != null ? ` · ${sr.edadPaciente} años` : ''}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Paciente atendido</p>
            <p className="text-sm font-medium text-gray-800">{pacienteAtendidoLabel(sr)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Motivo</p>
            <p className="text-sm text-gray-700">{motivoOnly(sr)}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">📍 {sr.address}</p>
        {sr.patient?.user.phone ? (
          <a
            href={`tel:${sr.patient.user.phone}`}
            className="mt-3 inline-flex min-h-[44px] items-center text-base font-semibold text-sky-700 touch-manipulation"
          >
            📞 Llamar al paciente
          </a>
        ) : null}
      </div>

      {chatEnabled ? (
        <ServiceRequestChat
          requestId={sr.id}
          currentUserRole="DOCTOR"
          title="Chat en vivo con el paciente"
          quickMessages={[
            'Voy en camino',
            'Llego en 5 minutos',
            'Estoy afuera',
            'Me estoy estacionando',
            '¿Me puede confirmar la referencia?',
          ]}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-600">
          El chat se habilita cuando la solicitud esté en <strong>cola</strong>, <strong>aceptada</strong> o{' '}
          <strong>en curso</strong>.
        </div>
      )}
    </div>
  );
}
