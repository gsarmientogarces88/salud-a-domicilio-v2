'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatLocalYmd } from '@/lib/formatLocalYmd';
import { geocodeChileAddressLine, reverseGeocodeChile } from '@/lib/mapboxGeocode';
import DateRangePicker from './DateRangePicker';
import MapaDireccion from '@/components/MapaDireccion';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
}

/** @deprecated La ubicación se deriva del mapa; se mantiene por compatibilidad de imports. */
export interface ScheduleLocationContext {
  region: string;
  province: string;
  commune: string;
}

interface AgendaSlot {
  id: string;
  startAt: string;
  endAt: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  /** @deprecated Ignorado: región/provincia/comuna salen del pin. */
  location?: ScheduleLocationContext;
  onLocationRegion?: (v: string) => void;
  onLocationProvince?: (v: string) => void;
  onLocationCommune?: (v: string) => void;
}

const GEOCODE_DEBOUNCE_MS = 700;
const MIN_ADDRESS_LENGTH = 8;

export default function ScheduleModal({ isOpen, onClose, doctor }: ScheduleModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [addressText, setAddressText] = useState('');
  const [confirmedAddress, setConfirmedAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [adminArea, setAdminArea] = useState({
    region: 'Chile',
    province: 'Sin especificar',
    commune: 'Sin especificar',
  });
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const skipNextGeocodeRef = useRef(false);
  const geocodeRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedDate(null);
    setAgendaSlots([]);
    setSelectedSlot(null);
    setSlotsError('');
    setAddressText('');
    setConfirmedAddress('');
    setCoords(null);
    setAdminArea({ region: 'Chile', province: 'Sin especificar', commune: 'Sin especificar' });
    setGeocodeState({ loading: false, error: null });
    setGpsHint(null);
    setNotes('');
    setSubmitError('');
    setSuccessMessage('');
    skipNextGeocodeRef.current = false;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reset();
  }, [isOpen, doctor?.id, reset]);

  // GPS inicial al entrar al paso 2
  useEffect(() => {
    if (!isOpen || step !== 2) return;
    if (!navigator.geolocation) return;
    if (coords) return;

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
          setAddressText((prev) => prev || result.placeName);
          setAdminArea({
            region: result.region || 'Chile',
            province: result.province || 'Sin especificar',
            commune: result.commune || 'Sin especificar',
          });
        }
      },
      () => setGpsHint(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [isOpen, step, coords]);

  // Geocodificación automática al escribir dirección
  useEffect(() => {
    if (step !== 2) return;
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }

    const query = addressText.replace(/\s+/g, ' ').trim();
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
      setAdminArea({
        region: result.region || 'Chile',
        province: result.province || 'Sin especificar',
        commune: result.commune || 'Sin especificar',
      });
      setGeocodeState({ loading: false, error: null });
    }, GEOCODE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [addressText, step]);

  useEffect(() => {
    const load = async () => {
      if (!doctor || !selectedDate) return;
      setLoadingSlots(true);
      setSlotsError('');
      setSelectedSlot(null);
      try {
        const dateParam = formatLocalYmd(selectedDate);
        const res = await apiFetch<{ data: AgendaSlot[] }>(
          `/agenda/slots?professionalId=${encodeURIComponent(doctor.id)}&date=${dateParam}`,
        );
        setAgendaSlots(res.data || []);
      } catch (e: any) {
        setAgendaSlots([]);
        setSlotsError(e.message || 'No se pudieron cargar los horarios.');
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [doctor, selectedDate]);

  const handleCoordsChange = async (next: { lat: number; lng: number } | null) => {
    setCoords(next);
    if (!next) return;

    const reverseId = ++reverseRequestIdRef.current;
    const result = await reverseGeocodeChile(next.lat, next.lng);
    if (reverseId !== reverseRequestIdRef.current) return;

    if (result.ok) {
      skipNextGeocodeRef.current = true;
      setConfirmedAddress(result.placeName);
      setAddressText(result.placeName);
      setAdminArea({
        region: result.region || 'Chile',
        province: result.province || 'Sin especificar',
        commune: result.commune || 'Sin especificar',
      });
      setGeocodeState({ loading: false, error: null });
    }
  };

  const canGoStep2 = Boolean(doctor && selectedDate && selectedSlot);
  const canSubmit =
    Boolean(doctor) &&
    Boolean(selectedSlot) &&
    addressText.trim().length >= MIN_ADDRESS_LENGTH &&
    coords != null &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng);

  const handleSubmit = async () => {
    if (!canSubmit || !doctor || !selectedSlot || !coords) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiFetch<{ message?: string; data: { id: string } }>('/agenda/requests', {
        method: 'POST',
        body: JSON.stringify({
          professionalId: doctor.id,
          slotId: selectedSlot.id,
          addressText: (confirmedAddress || addressText).trim(),
          region: adminArea.region || 'Chile',
          province: adminArea.province || 'Sin especificar',
          city: adminArea.province || 'Sin especificar',
          commune: adminArea.commune || 'Sin especificar',
          lat: coords.lat,
          lng: coords.lng,
          notes: notes.trim() || undefined,
        }),
      });
      setSuccessMessage(res.message || 'Solicitud enviada, esperando confirmación del médico.');
      setTimeout(() => {
        onClose();
        reset();
        router.push(`/dashboard/patient/agenda/estado/${res.data.id}`);
      }, 1600);
    } catch (e: any) {
      setSubmitError(e.message || 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-gray-900">Agendar visita</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Paso {step} de 2
          </span>
        </div>
        {doctor && (
          <p className="mb-4 text-sm text-gray-600">
            {doctor.name} · {doctor.specialty}
          </p>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="text-xs text-gray-500">
              Las visitas programadas no permiten el mismo día y requieren al menos 12 horas de anticipación.
            </p>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Fecha</label>
              <DateRangePicker selectedDate={selectedDate} onSelect={setSelectedDate} fromDayOffset={1} dayCount={14} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Hora disponible</label>
              {loadingSlots && <p className="text-xs text-gray-500">Cargando horarios...</p>}
              {!loadingSlots && agendaSlots.length === 0 && selectedDate && !slotsError && (
                <p className="text-xs text-gray-500">No hay cupos para esta fecha. Prueba otra.</p>
              )}
              {slotsError && <p className="text-xs text-red-600">{slotsError}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {agendaSlots.map((s) => {
                  const label = new Date(s.startAt).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const active = selectedSlot?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirma el domicilio en el mapa. Región, provincia y comuna se obtienen del pin.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Dirección *</label>
              <input
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Calle, número, comuna"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {gpsHint && <p className="text-[11px] text-sky-700">{gpsHint}</p>}
            {geocodeState.loading && <p className="text-[11px] text-gray-500">Buscando ubicación…</p>}
            {geocodeState.error && <p className="text-xs text-amber-700">{geocodeState.error}</p>}
            <MapaDireccion
              position={coords}
              onChangeCoords={(c) => {
                void handleCoordsChange(c);
              }}
              label="Confirma la ubicación en el mapa"
            />
            {confirmedAddress ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Dirección confirmada
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-900">{confirmedAddress}</p>
                {coords && (
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Escribe tu dirección o mueve el pin para confirmar la ubicación.
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Notas para el médico (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Motivo breve de la consulta"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1);
                setCoords(null);
                setConfirmedAddress('');
                setGeocodeState({ loading: false, error: null });
              } else onClose();
            }}
            disabled={submitting || geocodeState.loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {step === 2 ? 'Atrás' : 'Cancelar'}
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={!canGoStep2}
              onClick={() => setStep(2)}
              className={`flex-1 rounded-lg px-4 py-2 font-medium text-white ${
                canGoStep2 ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300'
              }`}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit || submitting || geocodeState.loading}
              onClick={() => void handleSubmit()}
              className={`flex-1 rounded-lg px-4 py-2 font-medium text-white ${
                canSubmit && !submitting && !geocodeState.loading
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-gray-300'
              }`}
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          )}
        </div>
        {submitError && <p className="mt-3 text-center text-xs text-red-600">{submitError}</p>}
      </div>
    </div>
  );
}
