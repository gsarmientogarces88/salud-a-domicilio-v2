'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { geocodeChileAddressLine, reverseGeocodeChile } from '@/lib/mapboxGeocode';
import { useAuth } from '@/context/AuthContext';
import MapaDireccion from '@/components/MapaDireccion';

type LatLng = { lat: number; lng: number };

const GEOCODE_DEBOUNCE_MS = 700;
const MIN_ADDRESS_LENGTH = 8;

const inputClass =
  'h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] bg-white px-3 text-sm text-[var(--color-texto-1)] outline-none placeholder:text-[var(--color-texto-4)] focus:border-[var(--color-azul-borde)]';
const inputErrorClass = 'border-[var(--color-rojo-urgencia)] focus:border-[var(--color-rojo-urgencia)]';
const labelClass = 'mb-1 block text-xs font-medium text-[var(--color-texto-2)]';

export default function SimpleUrgentRequestForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [sintomas, setSintomas] = useState('');
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [depto, setDepto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [confirmedAddress, setConfirmedAddress] = useState('');
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [openServiceInfo, setOpenServiceInfo] = useState<
    | null
    | { id: string; status: 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'ACCEPTED'; doctorName?: string | null }
  >(null);

  const skipNextGeocodeRef = useRef(false);
  const geocodeRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName) setNombre((prev) => prev || fullName);
  }, [user]);

  // Ubicación actual como punto inicial (si el usuario autoriza)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setGpsHint('Usamos tu ubicación actual. Ajusta el pin o la dirección si es necesario.');

        const reverseId = ++reverseRequestIdRef.current;
        const result = await reverseGeocodeChile(next.lat, next.lng);
        if (reverseId !== reverseRequestIdRef.current) return;

        if (result.ok) {
          skipNextGeocodeRef.current = true;
          setConfirmedAddress(result.placeName);
          setDireccion((prev) => prev || result.placeName);
        }
      },
      () => {
        setGpsHint(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  // Geocodificación automática al escribir la dirección
  useEffect(() => {
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }

    const query = direccion.replace(/\s+/g, ' ').trim();
    if (query.length < MIN_ADDRESS_LENGTH) return;

    const timer = window.setTimeout(async () => {
      const requestId = ++geocodeRequestIdRef.current;
      setGeocodeState({ loading: true, error: null });

      const result = await geocodeChileAddressLine(`${query}, Chile`);
      if (requestId !== geocodeRequestIdRef.current) return;

      if (!result.ok) {
        setGeocodeState({ loading: false, error: result.error });
        return;
      }

      setCoords({ lat: result.lat, lng: result.lng });
      setConfirmedAddress(result.placeName || query);
      setGeocodeState({ loading: false, error: null });
      setErrors((prev) => {
        if (!prev.coords && !prev.direccion) return prev;
        const { coords: _c, direccion: _d, ...rest } = prev;
        return rest;
      });
    }, GEOCODE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [direccion]);

  const handleCoordsChange = async (next: LatLng | null) => {
    setCoords(next);
    if (!next) return;

    setErrors((prev) => {
      if (!prev.coords) return prev;
      const { coords: _c, ...rest } = prev;
      return rest;
    });

    const reverseId = ++reverseRequestIdRef.current;
    const result = await reverseGeocodeChile(next.lat, next.lng);
    if (reverseId !== reverseRequestIdRef.current) return;

    if (result.ok) {
      skipNextGeocodeRef.current = true;
      setConfirmedAddress(result.placeName);
      setDireccion(result.placeName);
      setGeocodeState({ loading: false, error: null });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!sintomas.trim()) e.sintomas = 'Indica los síntomas o el motivo de consulta';
    if (!nombre.trim()) e.nombre = 'Nombre completo requerido';
    if (!edad.trim()) e.edad = 'Edad requerida';
    else if (parseInt(edad, 10) < 1 || parseInt(edad, 10) > 120) e.edad = 'Edad inválida (1–120)';
    if (!direccion.trim()) e.direccion = 'Dirección requerida';
    if (!telefono.trim()) e.telefono = 'Teléfono de contacto requerido';
    if (
      !coords ||
      !Number.isFinite(coords.lat) ||
      !Number.isFinite(coords.lng)
    ) {
      e.coords = 'Confirma tu ubicación en el mapa para continuar';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setOpenServiceInfo(null);

    const validatedAddress = (confirmedAddress || direccion).trim();
    const referenciasParts = [
      depto.trim() ? `Depto/Casa: ${depto.trim()}` : null,
      confirmedAddress.trim() ? `Dirección validada: ${confirmedAddress.trim()}` : null,
    ].filter(Boolean);

    try {
      const payload = {
        type: 'URGENT' as const,
        description: sintomas.trim(),
        address: validatedAddress,
        referencias: referenciasParts.length > 0 ? referenciasParts.join(' · ') : undefined,
        telefono: telefono.trim(),
        pacienteNombre: nombre.trim(),
        edadPaciente: parseInt(edad, 10),
      };

      const created = await apiFetch<{
        data: { id: string };
      }>('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await apiFetch(`/services/${created.data.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          lat: coords!.lat,
          lng: coords!.lng,
          source: 'PATIENT_MAP_PIN',
          precision: 'UNKNOWN',
        }),
      });

      router.push(
        `/dashboard/patient/medico/urgente/estado?id=${encodeURIComponent(created.data.id)}`,
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409 && err.body?.data?.openService) {
        const os = err.body.data.openService as {
          id: string;
          status: string;
          doctorName?: string | null;
        };
        setOpenServiceInfo({
          id: os.id,
          status: os.status as 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'ACCEPTED',
          doctorName: os.doctorName ?? null,
        });
        setErrors({ submit: err.message });
      } else {
        const message =
          err instanceof Error ? err.message : 'Error al crear la solicitud';
        setErrors({ submit: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="solicitud-simple"
      onSubmit={handleSubmit}
      className="rounded-[14px] border border-[var(--color-rojo-borde)] bg-white p-4 shadow-sm sm:p-5"
      noValidate
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-texto-1)]">
            <span aria-hidden>🚑</span>
            Solicitud Simple
          </h2>
          <p className="mt-1 text-xs text-[var(--color-texto-3)]">
            Completa los datos y confirma tu ubicación. Menos de 60 segundos.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-rojo-claro)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rojo-urgencia)]">
          Urgencia
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="simple-sintomas" className={labelClass}>
            Síntomas o motivo de consulta *
          </label>
          <textarea
            id="simple-sintomas"
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
            rows={2}
            placeholder="Ej: Fiebre y dolor de garganta desde ayer"
            className={`${inputClass} h-auto min-h-[64px] py-2 ${errors.sintomas ? inputErrorClass : ''}`}
          />
          {errors.sintomas && <p className="mt-1 text-xs text-[var(--color-rojo-urgencia)]">{errors.sintomas}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="simple-nombre" className={labelClass}>
              Nombre completo *
            </label>
            <input
              id="simple-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              autoComplete="name"
              className={`${inputClass} ${errors.nombre ? inputErrorClass : ''}`}
            />
            {errors.nombre && <p className="mt-1 text-xs text-[var(--color-rojo-urgencia)]">{errors.nombre}</p>}
          </div>
          <div>
            <label htmlFor="simple-edad" className={labelClass}>
              Edad *
            </label>
            <input
              id="simple-edad"
              type="number"
              min={1}
              max={120}
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              placeholder="Ej: 35"
              className={`${inputClass} ${errors.edad ? inputErrorClass : ''}`}
            />
            {errors.edad && <p className="mt-1 text-xs text-[var(--color-rojo-urgencia)]">{errors.edad}</p>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
          <div>
            <label htmlFor="simple-direccion" className={labelClass}>
              Dirección *
            </label>
            <input
              id="simple-direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, comuna"
              autoComplete="street-address"
              className={`${inputClass} ${errors.direccion ? inputErrorClass : ''}`}
            />
            {errors.direccion && (
              <p className="mt-1 text-xs text-[var(--color-rojo-urgencia)]">{errors.direccion}</p>
            )}
          </div>
          <div>
            <label htmlFor="simple-depto" className={labelClass}>
              N° departamento
            </label>
            <input
              id="simple-depto"
              type="text"
              value={depto}
              onChange={(e) => setDepto(e.target.value)}
              placeholder="Opcional"
              className={inputClass}
            />
          </div>
        </div>

        {gpsHint && (
          <p className="text-[11px] text-[var(--color-azul-primario)]">{gpsHint}</p>
        )}
        {geocodeState.loading && (
          <p className="text-[11px] text-[var(--color-texto-3)]">Buscando ubicación…</p>
        )}
        {geocodeState.error && !errors.coords && (
          <p className="text-xs text-amber-700">{geocodeState.error}</p>
        )}

        <MapaDireccion
          position={coords}
          onChangeCoords={(next) => {
            void handleCoordsChange(next);
          }}
          mapClassName="h-40 sm:h-44"
          label="Confirma la ubicación en el mapa"
        />
        {errors.coords && (
          <p className="text-xs text-[var(--color-rojo-urgencia)]">{errors.coords}</p>
        )}

        {confirmedAddress ? (
          <div className="rounded-[8px] border border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-texto-3)]">
              Dirección confirmada
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-texto-1)]">{confirmedAddress}</p>
            {coords && (
              <p className="mt-0.5 text-[10px] text-[var(--color-texto-4)]">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--color-texto-4)]">
            Escribe tu dirección para ubicar el pin automáticamente.
          </p>
        )}

        <div>
          <label htmlFor="simple-telefono" className={labelClass}>
            Teléfono de contacto *
          </label>
          <input
            id="simple-telefono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
            className={`${inputClass} ${errors.telefono ? inputErrorClass : ''}`}
          />
          {errors.telefono && (
            <p className="mt-1 text-xs text-[var(--color-rojo-urgencia)]">{errors.telefono}</p>
          )}
        </div>
      </div>

      {errors.submit && (
        <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{errors.submit}</p>
          {openServiceInfo && (
            <div className="mt-2 text-sm text-amber-900/90">
              {openServiceInfo.status === 'IN_PROGRESS' ? (
                <p>
                  Tu atención está en curso
                  {openServiceInfo.doctorName ? ` con el Dr. ${openServiceInfo.doctorName}` : ''}.
                </p>
              ) : openServiceInfo.status === 'QUEUED' ? (
                <p>El médico aceptó tu solicitud, pero está terminando otra atención.</p>
              ) : (
                <p>Tu solicitud está esperando que un médico la acepte.</p>
              )}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/patient/medico/urgente/estado?id=${encodeURIComponent(openServiceInfo.id)}`,
                  )
                }
                className="mt-3 rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100/50"
              >
                Ver atención actual
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || geocodeState.loading}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-rojo-urgencia)] text-sm font-semibold text-white hover:bg-[#C93939] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Enviando solicitud…' : '🚑 Solicitar Médico a Domicilio'}
      </button>
      <p className="mt-2 text-center text-[11px] text-[var(--color-texto-4)]">
        Precio fijo $50.000 · Un médico aceptará en menos de 2 minutos
      </p>
      <p className="mt-3 rounded-[10px] border border-[var(--color-rojo-borde)] bg-[var(--color-rojo-claro)] px-3 py-2.5 text-center text-[12px] leading-5 text-[var(--color-rojo-urgencia)]">
        Medicilio no reemplaza servicios de emergencia: ante una emergencia grave debes llamar al{' '}
        <a href="tel:131" className="font-semibold underline underline-offset-2">
          131
        </a>
        .
      </p>
    </form>
  );
}
