'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import StepProgress from '@/components/medico/StepProgress';
import TrackingMapMock from '@/components/medico/TrackingMapMock';
import ServiceRequestChat from '@/components/chat/ServiceRequestChat';

type ServiceStatus = 'PENDING' | 'QUEUED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

type ServiceRequest = {
  id: string;
  type: 'URGENT' | 'SCHEDULED';
  status: ServiceStatus;
  createdAt: string;
  expiresAt?: string | null;
  address: string;
  doctor?: { user: { firstName: string; lastName: string } } | null;
};

const URGENT_TTL_SECONDS = 15 * 60;

function computeRemainingSeconds(sr: ServiceRequest | null, nowMs: number) {
  if (!sr) return null;
  if (sr.status !== 'PENDING') return null;

  const createdMs = new Date(sr.createdAt).getTime();
  const expiresMs = sr.expiresAt ? new Date(sr.expiresAt).getTime() : createdMs + URGENT_TTL_SECONDS * 1000;
  const diffSec = Math.floor((expiresMs - nowMs) / 1000);
  return Math.max(0, diffSec);
}

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function UrgentStatusPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestIdFromUrl = searchParams.get('id');
  const [resolvedRequestId, setResolvedRequestId] = useState<string | null>(requestIdFromUrl);

  const [sr, setSr] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const remainingSeconds = useMemo(() => computeRemainingSeconds(sr, nowMs), [sr, nowMs]);
  const expired = remainingSeconds === 0 && sr?.status === 'PENDING';
  const inQueue = sr?.status === 'QUEUED';
  const inProgress = sr?.status === 'IN_PROGRESS';
  const completed = sr?.status === 'COMPLETED';
  const confirmed = inProgress || completed;
  const cancelled = sr?.status === 'CANCELLED';
  const canCancel = sr?.status === 'PENDING' && !expired;

  const resolveLatestUrgentRequestId = async () => {
    try {
      const res = await apiFetch<{ data: ServiceRequest[] }>('/services/me');
      const list = res.data || [];
      const latest = list
        .filter((x) => x.type === 'URGENT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (latest?.id) {
        setResolvedRequestId(latest.id);
        // eslint-disable-next-line no-console
        console.log('[patient.urgent.resolveLatest]', { id: latest.id, status: latest.status, createdAt: latest.createdAt, expiresAt: latest.expiresAt });
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[patient.urgent.resolveLatest] error:', e?.message || e);
    }
  };

  const load = async () => {
    if (!resolvedRequestId) return;
    try {
      // Cache-buster para evitar 304 sin body y que el polling funcione.
      const res = await apiFetch<{ data: ServiceRequest }>(`/services/${resolvedRequestId}?ts=${Date.now()}`);
      setSr(res.data);
      // eslint-disable-next-line no-console
      console.log('[patient.urgent.status]', {
        id: res.data.id,
        status: res.data.status,
        createdAt: res.data.createdAt,
        expiresAt: res.data.expiresAt,
        remainingSeconds: computeRemainingSeconds(res.data, Date.now()),
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[patient.urgent.status] load error:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResolvedRequestId(requestIdFromUrl);
  }, [requestIdFromUrl]);

  useEffect(() => {
    if (!resolvedRequestId) {
      resolveLatestUrgentRequestId().finally(() => setLoading(false));
      return;
    }
    load();
    const poll = setInterval(() => {
      // Si expiró o ya no está pendiente/en cola, dejamos de “spamear” el backend.
      if (sr?.status && !['PENDING', 'QUEUED', 'ACCEPTED', 'IN_PROGRESS'].includes(sr.status)) return;
      if (expired) return;
      load();
    }, 4000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRequestId, expired, sr?.status]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sr?.status && sr.status !== 'PENDING') {
      setShowCancelConfirm(false);
    }
  }, [sr?.status]);

  const handleCancel = async () => {
    if (!resolvedRequestId) return;
    if (!canCancel) return;

    setCancelling(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[patient.urgent.cancel] attempt:', {
        requestId: resolvedRequestId,
        status: sr?.status,
        createdAt: sr?.createdAt,
        expiresAt: sr?.expiresAt,
        remainingSeconds,
      });

      await apiFetch(`/services/${resolvedRequestId}`, { method: 'DELETE', body: JSON.stringify({}) });

      // Refrescar inmediatamente el estado
      await load();

      // eslint-disable-next-line no-console
      console.log('[patient.urgent.cancel] success:', { requestId: resolvedRequestId });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[patient.urgent.cancel] error:', e?.message || e);
      alert(e?.message || 'No se pudo cancelar la solicitud.');
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">📋</span>
            Pedir Médico a Domicilio
          </h1>
          <p className="text-gray-600">Seguimiento de tu solicitud</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 hover:bg-gray-100">
            <span className="text-xl">🔔</span>
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              1
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-sky-200 text-center leading-10 text-sky-700">
              👤
            </span>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        {!resolvedRequestId ? (
          <>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Solicitud no encontrada</h2>
            <p className="text-center text-gray-600">Vuelve a crear tu solicitud urgente para iniciar el seguimiento.</p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push('/dashboard/patient')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Volver al inicio
              </button>
            </div>
          </>
        ) : loading && !sr ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Cargando tu solicitud…</h2>
            <p className="text-center text-gray-600">Estamos sincronizando el estado con el prestador.</p>
          </>
        ) : cancelled ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
                ✖
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              Tu solicitud fue cancelada
            </h2>
            <p className="text-center text-gray-600">
              Si lo necesitas, puedes crear una nueva solicitud urgente.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/patient')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Volver al inicio
              </button>
              <button
                onClick={() => router.push('/dashboard/patient/medico')}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Solicitar nuevamente
              </button>
            </div>
          </>
        ) : expired ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
                ⚠
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              No hay médicos disponibles
            </h2>
            <p className="text-center text-gray-600">
              No hay médicos disponibles en tu zona en este momento.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/patient/medico')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Intentar nuevamente
              </button>
              <button
                onClick={() => router.push('/dashboard/patient')}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Volver al inicio
              </button>
            </div>
          </>
        ) : inQueue ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-4xl">
                ⏳
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              Médico asignado, en espera…
            </h2>
            <p className="text-center text-gray-600">
              {sr?.doctor?.user
                ? `El médico Dr. ${sr.doctor.user.firstName} ${sr.doctor.user.lastName} aceptó tu solicitud, pero actualmente está finalizando una atención médica. Luego irá para atenderte.`
                : 'Un médico aceptó tu solicitud, pero está finalizando una atención. Luego irá para atenderte.'}
            </p>

            <div className="mt-8">
              <ServiceRequestChat
                requestId={sr!.id}
                currentUserRole="PATIENT"
                title="Chat con tu médico"
                quickMessages={[
                  'Ya lo espero',
                  'Estoy bajando',
                  'La entrada es por atrás',
                  'Mi referencia es…',
                  'Estoy afuera',
                ]}
              />
            </div>
          </>
        ) : !confirmed ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              Buscando médico disponible…
            </h2>
            <p className="text-center text-gray-600">
              Estamos buscando el médico más cercano a tu ubicación.
            </p>

            <div className="mt-6 flex justify-center">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-5 py-3 text-center">
                <p className="text-xs font-medium text-sky-700">Tiempo restante</p>
                <p className={`mt-1 text-2xl font-bold ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                  {remainingSeconds == null ? '15:00' : formatMmSs(remainingSeconds)}
                </p>
                {expired ? (
                  <p className="mt-1 text-xs text-gray-600">
                    No encontramos un médico disponible en este momento.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    La solicitud expira automáticamente si nadie acepta.
                  </p>
                )}
              </div>
            </div>

            {canCancel && (
              <div className="mt-4 flex justify-center">
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="rounded-xl border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Cancelar solicitud
                  </button>
                ) : (
                  <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm font-semibold text-gray-900">
                      ¿Estás seguro de que deseas cancelar esta solicitud?
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Si cancelas, dejará de estar disponible para prestadores.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelling}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Volver
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {expired && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => router.push('/dashboard/patient/consultas?servicio=medico')}
                  className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => router.push('/dashboard/patient')}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Ilustración + Título */}
            <div className="mb-6 flex items-start gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-100 text-4xl">
                👨‍⚕️
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Consulta Médica Confirmada
                </h2>
                <p className="text-gray-600">
                  Un médico general está en camino a tu casa.
                </p>
              </div>
            </div>

            <StepProgress currentStep="camino" />

            {/* Info doctor + mapa */}
            <p className="mb-4 text-sm text-gray-600">
              Se estima que un médico llegará a tu hogar en aproximadamente:
            </p>

            <div className="mb-6 grid gap-6 md:grid-cols-3">
              {/* Card doctor */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-2xl">
                    👨‍⚕️
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">
                      {sr?.doctor?.user
                        ? `Dr. ${sr.doctor.user.firstName} ${sr.doctor.user.lastName}`
                        : 'Médico asignado'}
                    </p>
                    <p className="text-sm text-gray-600">Médico General, Urgencias</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  ✓ Profesional Verificado
                </span>
              </div>

              {/* Dirección */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  El médico más cercano se está dirigiendo a tu domicilio.
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  📍 {sr?.address || '—'}
                </p>
              </div>
            </div>

            {/* Mapa */}
            <div className="mb-6">
              <TrackingMapMock patientAddress={sr?.address || '—'} />
            </div>

            {/* Info adicional */}
            <div className="mb-6 space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <span>🕐</span>
                Dr. Rodrigo llega en 15 min aprox.
              </p>
              <p className="flex items-center gap-2">
                <span>🩺</span>
                Lleva equipo completo para atención segura
              </p>
              <p className="flex items-center gap-2">
                <span>📞</span>
                Teléfono 24/7 por cualquier consulta: +56 9 4435 0134
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">
                📞 Contactar Médico
              </button>
              <button className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-gray-800 hover:bg-amber-500">
                💬 Contactar Soporte 24/7
              </button>
            </div>

            {/* Chat (solo después de aceptación/cola) */}
            {sr?.id && (sr.status === 'ACCEPTED' || sr.status === 'QUEUED' || sr.status === 'IN_PROGRESS' || sr.status === 'COMPLETED') && (
              <div className="mt-8">
                <ServiceRequestChat
                  requestId={sr.id}
                  currentUserRole="PATIENT"
                  title="Chat con tu médico"
                  quickMessages={[
                    'Ya lo espero',
                    'Estoy bajando',
                    'La entrada es por atrás',
                    'Mi referencia es…',
                    'Estoy afuera',
                  ]}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra inferior */}
      <div className="mt-8 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          Podrás pagar con Bono de Isapre o en línea tras confirmar la atención médica.{' '}
          <a href="#" className="font-medium text-sky-600 hover:underline">
            Ve cómo funciona →
          </a>
        </p>
      </div>
    </div>
  );
}
