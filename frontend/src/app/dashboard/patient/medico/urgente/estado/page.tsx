'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import StepProgress from '@/components/medico/StepProgress';
import TrackingMapMock from '@/components/medico/TrackingMapMock';
import ServiceRequestChat from '@/components/chat/ServiceRequestChat';
import ArrivalPinPanel from '@/components/medico/ArrivalPinPanel';
import {
  AUTO_EXPIRE_PENDING_CANCEL_REASON,
  isAcceptedTimeoutCancellation,
  isQueuedTimeoutCancellation,
  URGENT_PENDING_FALLBACK_MINUTES,
  urgentExpiresAtMs,
} from '@/lib/serviceRequestTtl';

type ServiceStatus = 'PENDING' | 'QUEUED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

type ServiceRequest = {
  id: string;
  type: 'URGENT' | 'SCHEDULED';
  status: ServiceStatus;
  createdAt: string;
  startedAt?: string | null;
  expiresAt?: string | null;
  cancelReason?: string | null;
  address: string;
  arrivalPin?: string | null;
  arrivedAt?: string | null;
  doctor?: { user: { firstName: string; lastName: string } } | null;
};

function computeRemainingSeconds(sr: ServiceRequest | null, nowMs: number) {
  if (!sr) return null;
  if (sr.status !== 'PENDING') return null;

  const expiresMs = urgentExpiresAtMs(sr.createdAt, sr.expiresAt);
  const diffSec = Math.floor((expiresMs - nowMs) / 1000);
  return Math.max(0, diffSec);
}

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function minutesSinceStart(startedAtIso: string | null | undefined, nowMs: number): number | null {
  if (!startedAtIso) return null;
  const t = new Date(startedAtIso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 60_000));
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
  const [confirmingArrival, setConfirmingArrival] = useState(false);

  const remainingSeconds = useMemo(() => computeRemainingSeconds(sr, nowMs), [sr, nowMs]);
  const inQueue = sr?.status === 'QUEUED';
  const cancelled = sr?.status === 'CANCELLED';

  const attendingDoctorLabel = (s: ServiceRequest | null) =>
    s?.doctor?.user
      ? `Dr. ${s.doctor.user.firstName} ${s.doctor.user.lastName}`
      : 'Tu médico asignado';
  const isSystemExpiredCancel =
    cancelled && sr.cancelReason === AUTO_EXPIRE_PENDING_CANCEL_REASON;
  const clientTimerUp =
    sr?.status === 'PENDING' && remainingSeconds !== null && remainingSeconds <= 0;
  const showTimeUpUi = isSystemExpiredCancel || clientTimerUp;
  const showAcceptedTimeoutUi = cancelled && isAcceptedTimeoutCancellation(sr?.cancelReason);
  const showQueuedTimeoutUi = cancelled && isQueuedTimeoutCancellation(sr?.cancelReason);
  const showGenericCancelledUi =
    cancelled &&
    !showTimeUpUi &&
    !showAcceptedTimeoutUi &&
    !showQueuedTimeoutUi;
  const canCancel =
    sr?.status === 'PENDING' && remainingSeconds !== null && remainingSeconds > 0;

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
    void load();
    const terminal =
      sr?.status && !['PENDING', 'QUEUED', 'ACCEPTED', 'IN_PROGRESS'].includes(sr.status);
    if (terminal) return undefined;
    const poll = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRequestId, sr?.status]);

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

  const handleConfirmArrival = async () => {
    if (!resolvedRequestId) return;
    setConfirmingArrival(true);
    try {
      await apiFetch(`/services/${resolvedRequestId}/confirm-arrival`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'No se pudo confirmar la llegada.');
    } finally {
      setConfirmingArrival(false);
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
                onClick={() => router.push('/dashboard/patient/inicio')}
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
        ) : showGenericCancelledUi ? (
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
                onClick={() => router.push('/dashboard/patient/inicio')}
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
        ) : showTimeUpUi ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
                ⏱
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              Se agotó el tiempo de búsqueda
            </h2>
            <p className="text-center text-gray-600">
              Nadie aceptó tu solicitud dentro del plazo. Puedes intentar de nuevo en unos minutos.
            </p>
            {clientTimerUp && !isSystemExpiredCancel ? (
              <p className="mt-2 text-center text-xs text-gray-500">Sincronizando estado con el servidor…</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/patient/medico')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Intentar nuevamente
              </button>
              <button
                onClick={() => router.push('/dashboard/patient/inicio')}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Volver al inicio
              </button>
            </div>
          </>
        ) : showAcceptedTimeoutUi ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
                ⏱
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Solicitud cancelada por tiempo</h2>
            <p className="text-center text-gray-600">
              La solicitud fue cancelada porque no se inició la atención a tiempo. Puedes intentar solicitar de nuevo.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/patient/medico')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Solicitar nuevamente
              </button>
              <button
                onClick={() => router.push('/dashboard/patient/inicio')}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Volver al inicio
              </button>
            </div>
          </>
        ) : showQueuedTimeoutUi ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
                ⏱
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Espera cancelada por tiempo</h2>
            <p className="text-center text-gray-600">
              Tu solicitud en lista de espera expiró porque no avanzó a tiempo. Puedes crear una nueva solicitud.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/patient/medico')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Solicitar nuevamente
              </button>
              <button
                onClick={() => router.push('/dashboard/patient/inicio')}
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

            <div className="mx-auto mt-6 max-w-md">
              <ArrivalPinPanel
                pin={sr?.arrivalPin}
                showConfirmButton={Boolean(sr && !sr.arrivedAt)}
                confirming={confirmingArrival}
                onConfirmArrival={() => void handleConfirmArrival()}
              />
            </div>

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
        ) : sr?.status === 'PENDING' ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              Buscando médico disponible…
            </h2>
            <p className="text-center text-gray-600">
              Estamos buscando un profesional disponible cerca de tu ubicación.
            </p>

            <div className="mt-6 flex justify-center">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-5 py-3 text-center">
                <p className="text-xs font-medium text-sky-700">Tiempo máximo de búsqueda</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                  {remainingSeconds != null
                    ? formatMmSs(remainingSeconds)
                    : formatMmSs(URGENT_PENDING_FALLBACK_MINUTES * 60)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Si nadie acepta dentro de este plazo, la solicitud se cerrará sola. Cuando un médico acepte, este
                  contador deja de aplicar.
                </p>
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

          </>
        ) : sr?.status === 'COMPLETED' ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">✓</div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Atención finalizada</h2>
            <p className="text-center text-gray-600">
              Gracias por confiar en nosotros. Si necesitas otra consulta, puedes solicitarla desde tu inicio.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/patient/inicio')}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Volver al inicio
              </button>
            </div>
            {sr?.id ? (
              <div className="mt-8">
                <ServiceRequestChat
                  requestId={sr.id}
                  currentUserRole="PATIENT"
                  title="Chat con tu médico"
                  quickMessages={['Gracias por la atención', 'Quedó todo claro', 'Hasta pronto']}
                />
              </div>
            ) : null}
          </>
        ) : sr?.status === 'IN_PROGRESS' ? (
          <>
            <div className="mb-6 flex items-start gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-4xl">
                🩺
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Atención en curso</h2>
                <p className="text-gray-600">
                  {attendingDoctorLabel(sr)} está atendiendo o se dirige a tu domicilio según lo acordado por chat.
                </p>
                {minutesSinceStart(sr.startedAt, nowMs) != null ? (
                  <p className="mt-2 text-sm font-medium text-emerald-800">
                    Atención iniciada hace {minutesSinceStart(sr.startedAt, nowMs)} min
                    <span className="ml-1 font-normal text-gray-500">(se actualiza en vivo)</span>
                  </p>
                ) : null}
              </div>
            </div>
            <StepProgress currentStep="consulta" />
            <div className="mb-6">
              <ArrivalPinPanel
                pin={sr.arrivalPin}
                showConfirmButton={!sr.arrivedAt}
                confirming={confirmingArrival}
                onConfirmArrival={() => void handleConfirmArrival()}
              />
              {sr.arrivedAt ? (
                <p className="mt-2 text-center text-sm font-medium text-emerald-700">
                  Llegada confirmada
                </p>
              ) : null}
            </div>
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-gray-700">Profesional</p>
                <p className="font-bold text-gray-900">{attendingDoctorLabel(sr)}</p>
                <p className="mt-1 text-sm text-gray-600">Coordina hora de llegada y detalles por el chat.</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-gray-700">Domicilio</p>
                <p className="text-sm text-gray-600">📍 {sr?.address || '—'}</p>
              </div>
            </div>
            <div className="mb-6">
              <TrackingMapMock patientAddress={sr?.address || '—'} />
            </div>
            <p className="mb-4 text-sm text-gray-600">
              El tiempo de llegada no es un contador fijo: acuerda la referencia y el acceso con tu médico por chat o
              llamada.
            </p>
            {sr?.id ? (
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
            ) : null}
          </>
        ) : sr?.status === 'ACCEPTED' ? (
          <>
            <div className="mb-6 flex items-start gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-100 text-4xl">
                👨‍⚕️
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Médico asignado</h2>
                <p className="text-gray-600">
                  {attendingDoctorLabel(sr)} aceptó tu solicitud. Ya no aplica el tiempo de búsqueda de prestadores.
                </p>
              </div>
            </div>
            <StepProgress currentStep="camino" />
            <div className="mb-6">
              <ArrivalPinPanel
                pin={sr.arrivalPin}
                showConfirmButton={!sr.arrivedAt}
                confirming={confirmingArrival}
                onConfirmArrival={() => void handleConfirmArrival()}
              />
            </div>
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="font-bold text-gray-900">{attendingDoctorLabel(sr)}</p>
                <p className="mt-1 text-sm text-gray-600">Pronto iniciará el traslado; confirma detalles por chat.</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-600">📍 {sr?.address || '—'}</p>
              </div>
            </div>
            <div className="mb-6">
              <TrackingMapMock patientAddress={sr?.address || '—'} />
            </div>
            {sr?.id ? (
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
            ) : null}
          </>
        ) : (
          <>
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Sincronizando estado…</h2>
            <p className="text-center text-sm text-gray-600">
              Tu solicitud está en un estado que la app aún está actualizando ({sr?.status ?? 'desconocido'}). Espera unos
              segundos o vuelve a cargar.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Actualizar ahora
              </button>
            </div>
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
