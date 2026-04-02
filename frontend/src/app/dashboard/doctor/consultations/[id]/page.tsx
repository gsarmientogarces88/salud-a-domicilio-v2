'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import ServiceRequestChat from '@/components/chat/ServiceRequestChat';

type ServiceRequest = {
  id: string;
  status: string;
  description: string;
  address: string;
  createdAt: string;
  patient?: { user: { firstName: string; lastName: string; phone?: string | null } };
  doctor?: { user: { firstName: string; lastName: string; phone?: string | null } } | null;
};

export default function DoctorConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="text-sm text-gray-500">Cargando…</p>;
  if (!sr) return <p className="text-sm text-gray-500">No encontrada.</p>;

  const chatEnabled = sr.status === 'ACCEPTED' || sr.status === 'IN_PROGRESS' || sr.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atención</h1>
          <p className="text-sm text-gray-600">Detalle y coordinación con el paciente.</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Actualizar
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={sr.status} />
          <span className="text-xs text-gray-500">
            {new Date(sr.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900">
          {sr.patient ? `${sr.patient.user.firstName} ${sr.patient.user.lastName}` : 'Paciente'}
        </p>
        <p className="mt-1 text-sm text-gray-700">{sr.description}</p>
        <p className="mt-1 text-xs text-gray-500">📍 {sr.address}</p>
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
          El chat se habilita cuando la solicitud esté en <strong>ACCEPTED</strong> o <strong>IN_PROGRESS</strong>.
        </div>
      )}
    </div>
  );
}

