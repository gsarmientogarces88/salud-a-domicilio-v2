'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDoctorRequests } from '@/context/DoctorRequestsContext';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import MedicilioPuntosCard, { type LoyaltySummary } from '@/components/medico/MedicilioPuntosCard';
import LoyaltyMilestoneModal from '@/components/medico/LoyaltyMilestoneModal';
import {
  IN_PROGRESS_WARNING_AFTER_MINUTES,
  inProgressElapsedMinutes,
} from '@/lib/serviceRequestTtl';
import {
  motivoOnly,
  pacienteAtendidoLabel,
  pacienteDisplayLabel,
  solicitanteLabel,
} from '@/lib/serviceParties';

interface DoctorProfile {
  id: string;
  specialty: string;
  baseFee: number;
  isVerified: boolean;
  isAvailable: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Service {
  id: string;
  type: string;
  status: string;
  description: string;
  address: string;
  commune?: string | null;
  province?: string | null;
  city?: string | null;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  totalAmount: number;
  doctorNetAmount: number;
  createdAt: string;
  startedAt?: string | null;
  requestLat?: number | null;
  requestLng?: number | null;
  patient?: { user: { firstName: string; lastName: string; phone?: string | null } };
}

type LatLng = { lat: number; lng: number };

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function solicitanteWithAge(s: Service) {
  const base = solicitanteLabel(s);
  return s.edadPaciente != null ? `${base} · ${s.edadPaciente} años` : base;
}

const btnPrimary =
  'flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-2xl px-5 py-3.5 text-base font-bold shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]';
const btnSecondary =
  'flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 active:bg-gray-50 sm:w-auto';

const doctorDashDebug = process.env.NEXT_PUBLIC_DEBUG_DOCTOR_DASH === '1';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorRequests = useDoctorRequests();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [providerPos, setProviderPos] = useState<LatLng | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);

  const load = async () => {
    try {
      const [p, s, loc, loyaltyRes] = await Promise.all([
        apiFetch<{ data: DoctorProfile }>('/doctor/me'),
        apiFetch<{ data: Service[] }>(`/services/doctor/me?_=${Date.now()}`),
        apiFetch<{
          data: {
            effective:
              | { kind: 'LIVE'; lat: number; lng: number }
              | { kind: 'BASE'; lat: number; lng: number }
              | { kind: 'UNKNOWN' };
          };
        }>('/doctor/me/location/effective').catch(() => null as any),
        apiFetch<{ data: LoyaltySummary }>('/doctor/loyalty').catch(() => null),
      ]);
      setProfile(p.data);
      setServices(s.data);
      if (loyaltyRes?.data) setLoyalty(loyaltyRes.data);
      if (loc?.data?.effective?.kind === 'LIVE' || loc?.data?.effective?.kind === 'BASE') {
        setProviderPos({ lat: loc.data.effective.lat, lng: loc.data.effective.lng });
      } else {
        setProviderPos(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleAvailability = async () => {
    if (!profile) return;
    setSavingAvailability(true);
    try {
      const res = await apiFetch<{ data: DoctorProfile }>('/doctor/me/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !profile.isAvailable }),
      });
      setProfile(res.data);
      if (doctorRequests.enabled) {
        void doctorRequests.refresh(true);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  const {
    monthIncome,
    todayCount,
    avgArrival,
    avgRating,
    recent,
    activeService,
    queuedService,
    primaryFocus,
  } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let monthIncome = 0;
    let todayCount = 0;

    services.forEach((s) => {
      const d = new Date(s.createdAt);
      if (s.status === 'COMPLETED' && d.getMonth() === month && d.getFullYear() === year) {
        monthIncome += s.doctorNetAmount;
      }
      if (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        todayCount += 1;
      }
    });

    const recent = [...services]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Mock values si no hay info real
    const avgArrival = services.length ? 15 : 0;
    const avgRating = 4.8;

    /** Solo IN_PROGRESS es “activo”; si hubiera más de uno (dato inconsistente), el más reciente por startedAt. */
    const inProgressList = services
      .filter((s) => s.status === 'IN_PROGRESS')
      .sort((a, b) => {
        const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return tb - ta;
      });
    const activeService = inProgressList[0] ?? null;

    /** FIFO: no mezclar una aceptación vieja con el cierre reciente del listado ordenado desc por createdAt. */
    const queuedOrdered = [...services]
      .filter((s) => s.status === 'QUEUED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const queuedService = queuedOrdered[0] ?? null;

    const acceptedOrdered = [...services]
      .filter((s) => s.status === 'ACCEPTED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const acceptedService = acceptedOrdered[0] ?? null;

    type Primary =
      | { kind: 'IN_PROGRESS'; service: Service }
      | { kind: 'START'; service: Service; fromStatus: 'ACCEPTED' | 'QUEUED' }
      | { kind: 'NONE' };

    let primaryFocus: Primary = { kind: 'NONE' };
    if (activeService) primaryFocus = { kind: 'IN_PROGRESS', service: activeService };
    else if (acceptedService) primaryFocus = { kind: 'START', service: acceptedService, fromStatus: 'ACCEPTED' };
    else if (queuedService) primaryFocus = { kind: 'START', service: queuedService, fromStatus: 'QUEUED' };

    if (doctorDashDebug) {
      // eslint-disable-next-line no-console
      console.log('[doctorDashboard.snapshot]', {
        serviceCount: services.length,
        inProgressIds: inProgressList.map((s) => s.id),
        activeId: activeService?.id ?? null,
        acceptedId: acceptedService?.id ?? null,
        queuedId: queuedService?.id ?? null,
        primaryKind: primaryFocus.kind,
        primaryServiceId: primaryFocus.kind !== 'NONE' ? primaryFocus.service.id : null,
        primaryServiceStatus: primaryFocus.kind !== 'NONE' ? primaryFocus.service.status : null,
      });
    }

    return {
      monthIncome,
      todayCount,
      avgArrival,
      avgRating,
      recent,
      activeService,
      queuedService,
      primaryFocus,
    };
  }, [services]);

  const showInProgressLongWarning = useMemo(() => {
    if (!activeService || activeService.status !== 'IN_PROGRESS') return false;
    const elapsed = inProgressElapsedMinutes(activeService.startedAt ?? null, nowMs);
    if (elapsed == null) return false;
    return elapsed >= IN_PROGRESS_WARNING_AFTER_MINUTES;
  }, [activeService, nowMs]);

  const unseenMilestone = loyalty?.unseenMilestones[0] ?? null;

  const ackMilestone = async () => {
    if (!unseenMilestone) return;
    try {
      await apiFetch(`/doctor/loyalty/milestones/${unseenMilestone.id}/ack`, { method: 'POST' });
    } catch {
      // El modal no debe bloquear el dashboard si el ack falla; se reintentará al recargar.
    }
    setLoyalty((prev) =>
      prev
        ? { ...prev, unseenMilestones: prev.unseenMilestones.filter((m) => m.id !== unseenMilestone.id) }
        : prev,
    );
  };

  const finishActive = async (serviceId: string) => {
    const ok = window.confirm('¿Confirmas que finalizaste la atención?');
    if (!ok) return;
    setFinishingId(serviceId);
    const before = services.find((s) => s.id === serviceId)?.status ?? null;
    if (doctorDashDebug) {
      // eslint-disable-next-line no-console
      console.log('[doctorDashboard.finishActive]', { serviceId, beforeStatus: before });
    }
    try {
      const res = await apiFetch<{ data: Service }>(`/services/${serviceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (doctorDashDebug) {
        // eslint-disable-next-line no-console
        console.log('[doctorDashboard.finishActive]', {
          serviceId,
          responseStatus: res.data?.status,
        });
      }
      await load();
    } catch (e: any) {
      alert(e.message || 'No se pudo finalizar la atención.');
    } finally {
      setFinishingId(null);
    }
  };

  const startAttention = async (serviceId: string) => {
    const ok = window.confirm('¿Iniciar la atención en el domicilio del paciente?');
    if (!ok) return;
    setStartingId(serviceId);
    const before = services.find((s) => s.id === serviceId)?.status ?? null;
    if (doctorDashDebug) {
      // eslint-disable-next-line no-console
      console.log('[doctorDashboard.startAttention]', { serviceId, beforeStatus: before });
    }
    try {
      const res = await apiFetch<{ data: Service }>(`/services/${serviceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (doctorDashDebug) {
        // eslint-disable-next-line no-console
        console.log('[doctorDashboard.startAttention]', {
          serviceId,
          responseStatus: res.data?.status,
        });
      }
      await load();
    } catch (e: any) {
      alert(e.message || 'No se pudo iniciar la atención.');
    } finally {
      setStartingId(null);
    }
  };

  const buildMapsHref = (s: Service) => {
    const hasCoords = typeof s.requestLat === 'number' && typeof s.requestLng === 'number';
    const destination = hasCoords ? `${s.requestLat},${s.requestLng}` : s.address;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  };

  if (loading) {
    return (
      <p className="py-8 text-center text-base text-gray-600" role="status">
        Cargando…
      </p>
    );
  }

  const renderServiceBody = (s: Service) => {
    const phone = s.patient?.user.phone || null;
    const hasCoords =
      typeof s.requestLat === 'number' && typeof s.requestLng === 'number' && providerPos != null;
    const distKm = hasCoords
      ? haversineKm(providerPos!, { lat: s.requestLat as number, lng: s.requestLng as number })
      : null;
    const paciente = pacienteDisplayLabel(s);
    return (
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Solicitante</p>
          <p className="text-lg font-bold leading-snug text-gray-900 md:text-base">{solicitanteWithAge(s)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Paciente</p>
          <p className={`text-sm font-medium ${paciente.className || 'text-gray-800'}`}>{paciente.text}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Motivo</p>
          <p className="text-base leading-relaxed text-gray-700 md:text-sm">{motivoOnly(s)}</p>
        </div>
        <p className="text-sm leading-relaxed text-gray-600 md:text-xs">
          📍 {s.address}
          {s.commune ? `, ${s.commune}` : ''}
          {s.province || s.city ? ` · ${s.province || s.city}` : ''}
        </p>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex min-h-[44px] items-center gap-2 text-base font-semibold text-sky-700 touch-manipulation"
          >
            <span className="text-xl leading-none">📞</span>
            <span>Llamar al paciente</span>
          </a>
        ) : null}
        {distKm != null ? (
          <p className="text-sm font-semibold text-sky-700">A {distKm.toFixed(1)} km de tu ubicación</p>
        ) : null}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
          <a href={buildMapsHref(s)} target="_blank" rel="noreferrer" className={btnSecondary}>
            🗺 Ver ruta
          </a>
          <a href={`/dashboard/doctor/consultations/${s.id}`} className={`${btnSecondary} border-sky-200 bg-sky-50 text-sky-800`}>
            💬 Chat
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Móvil: primero; escritorio: después de KPI */}
      <section className="order-1 space-y-3 md:order-3">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-4 shadow-md ring-1 ring-sky-100/80 md:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Modo terreno</p>
              <p className="text-sm text-gray-600">Acciones para atención domiciliaria</p>
            </div>
            {primaryFocus.kind !== 'NONE' ? (
              <StatusBadge status={primaryFocus.service.status} />
            ) : null}
          </div>

          {primaryFocus.kind === 'NONE' ? (
            <p className="text-base text-gray-600">
              No tienes una atención activa ni pendiente de iniciar. Activa disponibilidad para recibir solicitudes.
            </p>
          ) : null}

          {primaryFocus.kind === 'IN_PROGRESS' ? (
            <>
              {showInProgressLongWarning ? (
                <div
                  className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                  role="status"
                >
                  <p className="font-semibold text-amber-900">Atención activa prolongada</p>
                  <p className="mt-1 text-amber-900/90">
                    Llevas más de {IN_PROGRESS_WARNING_AFTER_MINUTES} minutos. Si ya terminó, presiona{' '}
                    <span className="font-semibold">FINALIZAR ATENCIÓN</span>.
                  </p>
                </div>
              ) : null}
              {renderServiceBody(primaryFocus.service)}
              <button
                type="button"
                onClick={() => finishActive(primaryFocus.service.id)}
                disabled={finishingId === primaryFocus.service.id}
                className={`${btnPrimary} mt-4 bg-emerald-600 text-white hover:bg-emerald-700`}
              >
                {finishingId === primaryFocus.service.id ? 'Finalizando…' : 'FINALIZAR ATENCIÓN'}
              </button>
            </>
          ) : null}

          {primaryFocus.kind === 'START' ? (
            <>
              <p className="mb-2 text-sm text-gray-600">
                {primaryFocus.fromStatus === 'ACCEPTED'
                  ? 'Solicitud aceptada: inicia cuando estés en el domicilio.'
                  : 'Siguiente en cola: si no pasó a “en curso” sola, iníciala aquí (solo sin otra atención activa).'}
              </p>
              {renderServiceBody(primaryFocus.service)}
              <button
                type="button"
                onClick={() => startAttention(primaryFocus.service.id)}
                disabled={startingId === primaryFocus.service.id}
                className={`${btnPrimary} mt-4 bg-sky-600 text-white hover:bg-sky-700`}
              >
                {startingId === primaryFocus.service.id
                  ? 'Iniciando…'
                  : primaryFocus.fromStatus === 'ACCEPTED'
                    ? 'INICIAR ATENCIÓN'
                    : 'INICIAR ATENCIÓN (COLA)'}
              </button>
            </>
          ) : null}
        </div>

        {activeService && queuedService ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 shadow-sm ring-1 ring-amber-100">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-amber-950">Siguiente en cola</p>
              <StatusBadge status="QUEUED" />
            </div>
            <p className="text-base font-semibold text-gray-900">{solicitanteWithAge(queuedService)}</p>
            <p className="mt-1 text-sm text-gray-600">
              Paciente: {pacienteAtendidoLabel(queuedService)}
            </p>
            <p className="mt-1 text-sm text-gray-700">{motivoOnly(queuedService)}</p>
            <p className="mt-1 text-sm text-gray-600">📍 {queuedService.address}</p>
            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200/80">
              Se iniciará automáticamente al finalizar la atención actual, o puedes usar INICIAR cuando ya no haya otra
              en curso.
            </p>
            <a
              href={`/dashboard/doctor/consultations/${queuedService.id}`}
              className={`${btnSecondary} mt-3 border-amber-200 bg-white`}
            >
              💬 Chat con paciente (cola)
            </a>
          </div>
        ) : null}
      </section>

      <header className="order-2 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm md:order-1 md:p-5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-2xl md:h-14 md:w-14 md:text-3xl">
            👨‍⚕️
          </div>
          <div>
            <p className="text-xs text-gray-500 md:text-sm">Bienvenido</p>
            <p className="text-lg font-bold text-gray-900 md:text-xl">
              Dr. {user?.firstName} {user?.lastName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {profile?.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                  ✓ Verificado
                </span>
              )}
              {profile && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                  {profile.specialty}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
          <span className="text-xs text-gray-600 md:text-sm">Disponibilidad</span>
          <button
            type="button"
            onClick={toggleAvailability}
            disabled={savingAvailability}
            className={`flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-inner sm:w-auto ${
              profile?.isAvailable ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                profile?.isAvailable ? 'bg-green-200' : 'bg-gray-400'
              }`}
            />
            {profile?.isAvailable ? 'Disponible' : 'No disponible'}
          </button>
        </div>
      </header>

      <div className="order-3 hidden gap-4 md:order-2 md:grid md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Ingresos del mes</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">${monthIncome.toLocaleString('es-CL')}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Atenciones hoy</p>
          <p className="mt-2 text-2xl font-bold text-sky-600">{todayCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Tiempo promedio llegada</p>
          <p className="mt-2 text-2xl font-bold text-gray-800">
            {avgArrival || 15}
            <span className="ml-1 text-sm font-normal text-gray-500">min</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Rating promedio</p>
          <p className="mt-2 text-2xl font-bold text-yellow-500">
            {avgRating.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-gray-500">/ 5</span>
          </p>
        </div>
      </div>

      {loyalty ? (
        <div className="order-4">
          <MedicilioPuntosCard summary={loyalty} />
        </div>
      ) : null}

      <section className="order-5 rounded-2xl bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900 md:text-lg">Atenciones recientes</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes atenciones registradas.</p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {recent.map((s) => {
                const paciente = pacienteDisplayLabel(s);
                return (
                <li key={s.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{solicitanteLabel(s)}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className={`mt-1 text-xs ${paciente.className || 'text-gray-600'}`}>
                    Paciente: {paciente.text}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(s.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{motivoOnly(s)}</p>
                  <p className="mt-2 text-xs text-gray-600">${s.doctorNetAmount.toLocaleString('es-CL')}</p>
                  <a
                    href={`/dashboard/doctor/consultations/${s.id}`}
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-sky-50 py-2 text-sm font-semibold text-sky-700 touch-manipulation"
                  >
                    Ver detalle
                  </a>
                </li>
              );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Solicitante</th>
                    <th className="px-3 py-2">Paciente</th>
                    <th className="px-3 py-2">Motivo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Pago</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => {
                    const paciente = pacienteDisplayLabel(s);
                    return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {new Date(s.createdAt).toLocaleString('es-CL', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{solicitanteLabel(s)}</td>
                      <td className={`px-3 py-2 text-xs ${paciente.className || 'text-gray-700'}`}>
                        {paciente.text}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{motivoOnly(s)}</td>
                      <td className="px-3 py-2 text-xs">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">${s.doctorNetAmount.toLocaleString('es-CL')}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        <a
                          href={`/dashboard/doctor/consultations/${s.id}`}
                          className="rounded-lg bg-sky-50 px-3 py-1 font-medium text-sky-700 hover:bg-sky-100"
                        >
                          Ver
                        </a>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {unseenMilestone ? (
        <LoyaltyMilestoneModal milestone={unseenMilestone} onClose={() => void ackMilestone()} />
      ) : null}
    </div>
  );
}
