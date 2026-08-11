'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import { useNow } from '@/hooks/useNow';
import { useDoctorRequests, type DoctorAvailableRequestItem } from '@/context/DoctorRequestsContext';
import { pendingExpiresAtMs } from '@/lib/serviceRequestTtl';
import {
  motivoOnly,
  pacienteInlineLabel,
  solicitanteLabel,
} from '@/lib/serviceParties';

type RequestItem = DoctorAvailableRequestItem;

type MyAssignment = {
  id: string;
  status: string;
  description: string;
  address: string;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  patient?: { user: { firstName: string; lastName: string } };
};

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

function mapboxStaticUrl(lat: number, lng: number) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const size = '600x220';
  const zoom = 14;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+1d4ed8(${lng},${lat})/${lng},${lat},${zoom},0/${size}?access_token=${token}`;
}

function formatDistanceKm(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)} km`;
}

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getExpiresAtMs(s: RequestItem) {
  return pendingExpiresAtMs(s.type, s.createdAt, s.expiresAt);
}

function getRemainingSeconds(s: RequestItem, nowMs: number) {
  if (s.status !== 'PENDING') return null;
  const expiresAtMs = getExpiresAtMs(s);
  const diff = Math.floor((expiresAtMs - nowMs) / 1000);
  return Math.max(0, diff);
}

function shortAddress(address: string) {
  const trimmed = (address || '').trim();
  if (!trimmed) return 'Dirección no disponible';
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 48).trim()}…`;
}

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-salud-light/40 p-10 text-center">
    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
      🚑
    </div>
    <h2 className="mb-1 text-lg font-semibold text-gray-900">No hay solicitudes disponibles</h2>
    <p className="mb-4 max-w-md text-sm text-gray-600">
      Cuando un paciente solicite una consulta en tu zona, aparecerá aquí para que puedas aceptarla.
    </p>
  </div>
);

export default function DoctorRequestsPage() {
  const { availableItems: items, loading, refresh, isAvailable } = useDoctorRequests();
  const [filterType, setFilterType] = useState<'ALL' | 'URGENT' | 'SCHEDULED'>('ALL');
  const [search, setSearch] = useState('');
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'requesting' | 'updated' | 'denied' | 'base' | 'missing'
  >('idle');
  const [providerPos, setProviderPos] = useState<LatLng | null>(null);
  const [providerMsg, setProviderMsg] = useState<string | null>(null);
  const [myAssignments, setMyAssignments] = useState<MyAssignment[]>([]);
  const [finishingActiveId, setFinishingActiveId] = useState<string | null>(null);
  const nowMs = useNow(1000);

  const loadMyAssignments = async () => {
    try {
      const res = await apiFetch<{ data: MyAssignment[] }>(`/services/doctor/me?_=${Date.now()}`);
      setMyAssignments(res.data);
    } catch {
      /* no bloquear la lista de solicitudes entrantes */
    }
  };

  const inProgressAssignment = useMemo(
    () => myAssignments.find((s) => s.status === 'IN_PROGRESS') ?? null,
    [myAssignments]
  );

  const loadProviderEffectiveLocation = async () => {
    try {
      const res = await apiFetch<{
        data: {
          effective:
            | { kind: 'LIVE'; lat: number; lng: number }
            | { kind: 'BASE'; lat: number; lng: number }
            | { kind: 'UNKNOWN' };
          base: { lat: number | null; lng: number | null };
        };
      }>('/doctor/me/location/effective');

      if (res.data.effective.kind === 'LIVE' || res.data.effective.kind === 'BASE') {
        setProviderPos({ lat: res.data.effective.lat, lng: res.data.effective.lng });
        setLocationStatus(res.data.effective.kind === 'LIVE' ? 'updated' : 'base');
        setProviderMsg(res.data.effective.kind === 'LIVE' ? 'Ubicación actual actualizada' : 'Usando dirección base');
      } else {
        setProviderPos(null);
        setLocationStatus('missing');
        setProviderMsg('No tienes ubicación base configurada.');
      }
    } catch (e: any) {
      setProviderMsg(e.message || 'No se pudo cargar tu ubicación.');
    }
  };

  const updateLiveLocationFromBrowser = async () => {
    setProviderMsg(null);
    setLocationStatus('requesting');

    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setProviderMsg('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          await apiFetch('/doctor/me/location/live', {
            method: 'PUT',
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              accuracyMeters: accuracy ? Math.round(accuracy) : undefined,
              source: 'WEB_BROWSER',
              permissionState: 'granted',
            }),
          });

          setProviderPos({ lat: latitude, lng: longitude });
          setLocationStatus('updated');
          setProviderMsg('Ubicación actual actualizada');
        } catch (e: any) {
          setLocationStatus('denied');
          setProviderMsg(e.message || 'No se pudo guardar tu ubicación.');
        }
      },
      async () => {
        setLocationStatus('denied');
        setProviderMsg('Permiso de ubicación rechazado. Usando dirección base si existe.');
        await loadProviderEffectiveLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    loadProviderEffectiveLocation();
    updateLiveLocationFromBrowser();
  }, []);

  useEffect(() => {
    void loadMyAssignments();
  }, []);

  useEffect(() => {
    if (!inProgressAssignment) return undefined;
    const t = setInterval(() => void loadMyAssignments(), 12_000);
    return () => clearInterval(t);
  }, [inProgressAssignment?.id]);

  const finishInProgressAttention = async () => {
    if (!inProgressAssignment) return;
    const ok = window.confirm('¿Confirmas que finalizaste la atención?');
    if (!ok) return;
    setFinishingActiveId(inProgressAssignment.id);
    try {
      await apiFetch(`/services/${inProgressAssignment.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await loadMyAssignments();
      await refresh(true);
    } catch (e: any) {
      alert(e.message || 'No se pudo finalizar la atención.');
    } finally {
      setFinishingActiveId(null);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await apiFetch(`/services/${id}/accept`, { method: 'POST' });
      await refresh(true);
      await loadMyAssignments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async (id: string) => {
    const ok = window.confirm('¿Seguro que deseas rechazar esta solicitud?');
    if (!ok) return;
    try {
      await apiFetch(`/services/${id}/reject`, { method: 'POST', body: JSON.stringify({}) });
      await refresh(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = items.filter((s) => {
    if (filterType !== 'ALL' && s.type !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      motivoOnly(s).toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      solicitanteLabel(s).toLowerCase().includes(q) ||
      pacienteInlineLabel(s).toLowerCase().includes(q) ||
      (s.pacienteNombre || '').toLowerCase().includes(q)
    );
  });

  const unavailableBlock =
    isAvailable === false ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
        <p className="font-semibold">No estás disponible para recibir solicitudes</p>
        <p className="mt-2 text-amber-900/90">
          Activa tu disponibilidad en el <span className="font-medium">Dashboard</span> para ver
          solicitudes en tu zona. Mientras tanto no se buscarán nuevas solicitudes en esta vista.
        </p>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {unavailableBlock}

      {inProgressAssignment ? (
        <div
          className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-md ring-1 ring-emerald-200/80"
          role="region"
          aria-label="Atención en curso"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Atención en curso</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {solicitanteLabel(inProgressAssignment)}
                {inProgressAssignment.edadPaciente != null
                  ? ` · ${inProgressAssignment.edadPaciente} años`
                  : ''}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Paciente: {pacienteInlineLabel(inProgressAssignment)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                {motivoOnly(inProgressAssignment)}
              </p>
              <p className="mt-1 text-xs text-gray-600">📍 {inProgressAssignment.address}</p>
              <p className="mt-2 text-sm text-emerald-900">
                Al aceptar nuevas solicitudes puedes seguir aquí; cuando termines, finaliza para liberar al paciente.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={`/dashboard/doctor/consultations/${inProgressAssignment.id}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/80"
              >
                Chat / detalle
              </Link>
              <button
                type="button"
                onClick={() => void finishInProgressAttention()}
                disabled={finishingActiveId === inProgressAssignment.id}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finishingActiveId === inProgressAssignment.id ? 'Finalizando…' : 'FINALIZAR ATENCIÓN'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-sm text-gray-600">
            Revisa las solicitudes de consulta disponibles en tu zona y acepta las que puedas
            atender.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh(false)}
          disabled={loading || isAvailable === false}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>

      {/* Filtros simples */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ${
          isAvailable === false ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="ALL">Tipo: Todas</option>
          <option value="URGENT">Urgentes (AHORA)</option>
          <option value="SCHEDULED">Agendadas</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por paciente, dirección o motivo..."
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Bloque superior de ubicación */}
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Tu ubicación</p>
          <p className="text-xs text-gray-600">
            {locationStatus === 'requesting'
              ? 'Solicitando ubicación del navegador...'
              : providerMsg || '—'}
          </p>
          {providerPos && (
            <p className="mt-1 text-[11px] text-gray-400">
              Ref: {providerPos.lat.toFixed(4)}, {providerPos.lng.toFixed(4)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={updateLiveLocationFromBrowser}
            disabled={locationStatus === 'requesting'}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Actualizar ubicación actual
          </button>
        </div>
      </div>

      {isAvailable === false ? null : loading ? (
        <p className="text-sm text-gray-500">Cargando solicitudes...</p>
      ) : filtered.length === 0 ? (
        EMPTY_STATE
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              {(() => {
                const hasReqCoords =
                  typeof s.requestLat === 'number' && typeof s.requestLng === 'number';
                const computedKm =
                  providerPos && hasReqCoords
                    ? haversineKm(providerPos, {
                        lat: s.requestLat as number,
                        lng: s.requestLng as number,
                      })
                    : null;
                const distKm = typeof s.distanceKm === 'number' ? s.distanceKm : computedKm;
                const staticUrl = hasReqCoords
                  ? mapboxStaticUrl(s.requestLat as number, s.requestLng as number)
                  : null;

                // Fuente de verdad en vivo: expiresAt (si existe) o createdAt + 15min
                const remainingSeconds = getRemainingSeconds(s, nowMs);
                const isExpired = s.status === 'PENDING' && remainingSeconds != null && remainingSeconds <= 0;
                const actionsDisabled = isExpired;

                // Si expiró, lo ocultamos (y en el próximo refetch ya no vendrá)
                if (isExpired) return null;

                const destination = hasReqCoords
                  ? `${s.requestLat},${s.requestLng}`
                  : encodeURIComponent(s.address);
                const googleMapsHref = hasReqCoords
                  ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
                  : `https://www.google.com/maps/search/?api=1&query=${destination}`;

                return (
                  <>
                    {/* HEADER */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{s.type === 'URGENT' ? '🚨' : '📅'}</span>
                          <span className="truncate text-base font-semibold text-gray-900">
                            {solicitanteLabel(s)}
                            {s.edadPaciente != null ? ` · ${s.edadPaciente} años` : ''}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={s.status} />
                          {remainingSeconds != null ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                remainingSeconds <= 60
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-sky-50 text-sky-700'
                              }`}
                            >
                              Tiempo restante: {formatMmSs(remainingSeconds)}
                            </span>
                          ) : null}
                          <span className="text-xs text-gray-500">
                            ${s.totalAmount.toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      </div>
                      <a
                        href={googleMapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Abrir ruta
                      </a>
                    </div>

                    {/* INFO */}
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                            Solicitante
                          </p>
                          <p className="text-sm font-medium text-gray-900">{solicitanteLabel(s)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                            Paciente
                          </p>
                          <p className="text-sm font-medium text-gray-900">{pacienteInlineLabel(s)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Motivo</p>
                        <p className="text-sm font-medium text-gray-900">{motivoOnly(s)}</p>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Dirección</p>
                          <p className="text-sm text-gray-700">
                            {s.address}
                            {s.commune ? `, ${s.commune}` : ''}
                            {s.province || s.city ? ` · ${s.province || s.city}` : ''}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {s.telefono ? (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Teléfono</p>
                              <a
                                href={`tel:${s.telefono}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
                              >
                                <span className="text-base leading-none">📞</span>
                                <span className="truncate">{s.telefono}</span>
                              </a>
                            </div>
                          ) : null}

                          {s.referencias ? (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Referencia</p>
                              <p className="text-sm text-gray-700">
                                <span className="mr-1">📍</span>
                                {s.referencias}
                              </p>
                            </div>
                          ) : null}

                          {distKm != null ? (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Distancia</p>
                              <p className="text-sm font-semibold text-gray-900">
                                A {formatDistanceKm(distKm)} de tu ubicación
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* MAPA MINI */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                      <div className="relative h-[140px] w-full">
                        {hasReqCoords && staticUrl ? (
                          <img
                            src={staticUrl}
                            alt="Mapa ubicación paciente"
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <p className="text-xs text-gray-500">
                              {hasReqCoords
                                ? 'Configura NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa.'
                                : 'Esta solicitud aún no tiene ubicación confirmada.'}
                            </p>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

                        <div className="absolute left-3 top-3 flex flex-col gap-1">
                          {distKm != null ? (
                            <div className="w-fit rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
                              A {formatDistanceKm(distKm)} de tu ubicación
                            </div>
                          ) : null}
                          <div className="w-fit max-w-[92%] rounded-full bg-black/45 px-2.5 py-1 text-xs text-white">
                            {shortAddress(s.address)}
                          </div>
                        </div>

                        <div className="absolute bottom-3 right-3">
                          <a
                            href={googleMapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-white"
                          >
                            Ver en Google Maps
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleAccept(s.id)}
                        disabled={actionsDisabled}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleReject(s.id)}
                        disabled={actionsDisabled}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

