'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

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
  city?: string | null;
  totalAmount: number;
  doctorNetAmount: number;
  createdAt: string;
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

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [providerPos, setProviderPos] = useState<LatLng | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = async () => {
    try {
      const [p, s, loc] = await Promise.all([
        apiFetch<{ data: DoctorProfile }>('/doctor/me'),
        apiFetch<{ data: Service[] }>('/services/doctor/me'),
        apiFetch<{
          data: {
            effective:
              | { kind: 'LIVE'; lat: number; lng: number }
              | { kind: 'BASE'; lat: number; lng: number }
              | { kind: 'UNKNOWN' };
          };
        }>('/doctor/me/location/effective').catch(() => null as any),
      ]);
      setProfile(p.data);
      setServices(s.data);
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

    const activeService = services.find((s) => s.status === 'IN_PROGRESS') || null;
    const queuedService = services.find((s) => s.status === 'QUEUED') || null;

    return { monthIncome, todayCount, avgArrival, avgRating, recent, activeService, queuedService };
  }, [services]);

  const finishActive = async (serviceId: string) => {
    const ok = window.confirm('¿Confirmas que finalizaste la atención?');
    if (!ok) return;
    setFinishingId(serviceId);
    try {
      await apiFetch(`/services/${serviceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await load();
    } catch (e: any) {
      alert(e.message || 'No se pudo finalizar la atención.');
    } finally {
      setFinishingId(null);
    }
  };

  const buildMapsHref = (s: Service) => {
    const hasCoords = typeof s.requestLat === 'number' && typeof s.requestLng === 'number';
    const destination = hasCoords ? `${s.requestLat},${s.requestLng}` : s.address;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="space-y-6">
      {/* Header médico */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-3xl">
            👨‍⚕️
          </div>
          <div>
            <p className="text-sm text-gray-500">Bienvenido</p>
            <p className="text-xl font-bold text-gray-900">
              Dr. {user?.firstName} {user?.lastName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {profile?.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                  ✓ Profesional verificado
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Estado</span>
          <button
            onClick={toggleAvailability}
            disabled={savingAvailability}
            className={`flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-inner ${
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
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Ingresos del mes</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            ${monthIncome.toLocaleString('es-CL')}
          </p>
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

      {/* SERVICIO ACTIVO + COLA (prioritario) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-700">Servicio activo</p>
              <p className="text-sm text-gray-500">ATENCIÓN EN CURSO</p>
            </div>
            {activeService ? <StatusBadge status={activeService.status} /> : null}
          </div>

          {!activeService ? (
            <p className="text-sm text-gray-600">No tienes atenciones activas.</p>
          ) : (
            (() => {
              const patientName = activeService.patient
                ? `${activeService.patient.user.firstName} ${activeService.patient.user.lastName}`
                : 'Paciente';
              const phone = activeService.patient?.user.phone || null;
              const hasCoords =
                typeof activeService.requestLat === 'number' &&
                typeof activeService.requestLng === 'number' &&
                providerPos != null;
              const distKm = hasCoords
                ? haversineKm(providerPos!, {
                    lat: activeService.requestLat as number,
                    lng: activeService.requestLng as number,
                  })
                : null;

              return (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-900">{patientName}</p>
                  <p className="text-sm text-gray-700">{activeService.description}</p>
                  <p className="text-xs text-gray-500">
                    📍 {activeService.address}
                    {activeService.commune ? `, ${activeService.commune}` : ''}{' '}
                    {activeService.city ? `· ${activeService.city}` : ''}
                  </p>
                  {phone ? (
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800">
                      <span className="text-base leading-none">📞</span>
                      <span>{phone}</span>
                    </a>
                  ) : null}
                  {distKm != null ? (
                    <p className="text-xs font-semibold text-sky-700">
                      A {distKm.toFixed(1)} km de tu ubicación
                    </p>
                  ) : null}

                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={buildMapsHref(activeService)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ver ruta
                    </a>
                    <a
                      href={`/dashboard/doctor/consultations/${activeService.id}`}
                      className="rounded-lg bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      Chat con paciente
                    </a>
                    <button
                      onClick={() => finishActive(activeService.id)}
                      disabled={finishingId === activeService.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
                    >
                      {finishingId === activeService.id ? 'Finalizando…' : 'FINALIZAR ATENCIÓN'}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-700">Próximo servicio</p>
              <p className="text-sm text-gray-500">En espera</p>
            </div>
            {queuedService ? <StatusBadge status={queuedService.status} /> : null}
          </div>

          {!queuedService ? (
            <p className="text-sm text-gray-600">No tienes servicios en cola.</p>
          ) : (
            (() => {
              const patientName = queuedService.patient
                ? `${queuedService.patient.user.firstName} ${queuedService.patient.user.lastName}`
                : 'Paciente';
              return (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-900">{patientName}</p>
                  <p className="text-sm text-gray-700">{queuedService.description}</p>
                  <p className="text-xs text-gray-500">📍 {queuedService.address}</p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={`/dashboard/doctor/consultations/${queuedService.id}`}
                      className="rounded-lg bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      Chat con paciente
                    </a>
                    <span className="rounded-lg bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">
                      Se iniciará al finalizar la atención activa
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Atenciones recientes */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Atenciones recientes</h2>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes atenciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Pago</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {new Date(s.createdAt).toLocaleString('es-CL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {s.patient ? `${s.patient.user.firstName} ${s.patient.user.lastName}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{s.description}</td>
                    <td className="px-3 py-2 text-xs">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      ${s.doctorNetAmount.toLocaleString('es-CL')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <a
                        href={`/dashboard/doctor/consultations/${s.id}`}
                        className="rounded-lg bg-sky-50 px-3 py-1 font-medium text-sky-700 hover:bg-sky-100"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
