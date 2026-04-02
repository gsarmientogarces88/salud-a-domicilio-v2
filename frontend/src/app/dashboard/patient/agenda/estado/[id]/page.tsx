'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Status = 'PENDING_PRO_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';

interface RequestDetail {
  id: string;
  status: Status;
  addressText?: string;
  region: string;
  city: string;
  commune: string;
  notes: string | null;
  rejectReason?: string | null;
  rejectComment?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  expiredAt?: string | null;
  professional?: {
    user: { firstName: string; lastName: string };
    specialty: string;
  };
  slot?: { startAt: string; endAt: string };
  payment?: { amount: number; status: string };
}

const STATUS_LABELS: Record<Status, string> = {
  PENDING_PRO_CONFIRMATION: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
};

const STATUS_MESSAGES: Record<Status, string> = {
  PENDING_PRO_CONFIRMATION:
    'Solicitud enviada. Esperando confirmación del profesional (máx. 20 min).',
  CONFIRMED: 'Tu cita ha sido confirmada. El profesional te visitará en la fecha y hora acordadas.',
  REJECTED:
    'El profesional rechazó la solicitud. Puedes elegir otro disponible.',
  EXPIRED:
    'La solicitud expiró porque el profesional no respondió en 20 minutos. Puedes intentar de nuevo.',
};

export default function AgendaEstadoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch<{ data: RequestDetail }>(`/agenda/requests/${id}`);
        setRequest(res.data);
      } catch (e: any) {
        setError(e.message || 'No se pudo cargar la solicitud.');
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
        <p className="mt-4 text-sm text-gray-500">Cargando estado...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-red-600">{error || 'Solicitud no encontrada.'}</p>
        <Link
          href="/dashboard/patient/agenda"
          className="mt-4 inline-block text-sky-600 hover:underline"
        >
          ← Volver a agenda
        </Link>
      </div>
    );
  }

  const status = request.status as Status;
  const slotTime = request.slot
    ? new Date(request.slot.startAt).toLocaleString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span className="text-3xl">📅</span>
          Estado de tu solicitud
        </h1>
        <p className="text-gray-600">
          Seguimiento de la solicitud de agenda a domicilio.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <span
            className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${
              status === 'CONFIRMED'
                ? 'bg-green-100 text-green-700'
                : status === 'REJECTED' || status === 'EXPIRED'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {STATUS_LABELS[status]}
          </span>
          {request.payment && (
            <span className="text-sm text-gray-600">
              $ {(request.payment.amount || 0).toLocaleString('es-CL')} CLP
            </span>
          )}
        </div>

        <p className="mb-6 text-gray-600">{STATUS_MESSAGES[status]}</p>

        <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          {request.professional && (
            <div>
              <p className="text-xs font-medium text-gray-500">Profesional</p>
              <p className="font-medium text-gray-900">
                {request.professional.user.firstName} {request.professional.user.lastName}
              </p>
              <p className="text-sm text-gray-600">{request.professional.specialty}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500">Fecha y hora</p>
            <p className="text-gray-900 capitalize">{slotTime}</p>
          </div>
          {request.addressText && (
            <div>
              <p className="text-xs font-medium text-gray-500">Dirección</p>
              <p className="text-gray-900">{request.addressText}</p>
            </div>
          )}
          {request.rejectReason && (
            <div>
              <p className="text-xs font-medium text-gray-500">Motivo del rechazo</p>
              <p className="text-gray-900">
                {request.rejectReason}
                {request.rejectComment ? `: ${request.rejectComment}` : ''}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/patient/agenda"
            className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-700"
          >
            {status === 'REJECTED' || status === 'EXPIRED'
              ? 'Buscar otros profesionales'
              : 'Nueva solicitud'}
          </Link>
          <Link
            href="/dashboard/patient"
            className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
