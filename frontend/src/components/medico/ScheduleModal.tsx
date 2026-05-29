'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatChileTimeFromIso, formatChileYmd, jsWeekdayChile } from '@/lib/formatLocalYmd';
import { buildChileGeocodeQuery, geocodeChileAddressLine } from '@/lib/mapboxGeocode';
import DateRangePicker from './DateRangePicker';
import MapaDireccion from '@/components/MapaDireccion';
import LocationSelector from '@/components/ui/LocationSelector';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
}

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
  location: ScheduleLocationContext;
  onLocationRegion: (v: string) => void;
  onLocationProvince: (v: string) => void;
  onLocationCommune: (v: string) => void;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  doctor,
  location,
  onLocationRegion,
  onLocationProvince,
  onLocationCommune,
}: ScheduleModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [addressText, setAddressText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  /** Clave normalizada de la última búsqueda exitosa; evita enviar con pin movido sin geocodificar antes. */
  const [searchKey, setSearchKey] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const reset = useCallback(() => {
    setStep(1);
    setSelectedDate(null);
    setAgendaSlots([]);
    setSelectedSlot(null);
    setLoadingSlots(false);
    setSlotsError('');
    setAddressText('');
    setCoords(null);
    setSearchKey(null);
    setGeocodeState({ loading: false, error: null });
    setNotes('');
    setSubmitError('');
    setSuccessMessage('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reset();
  }, [isOpen, doctor?.id, reset]);

  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const currentAddressKey = useMemo(
    () =>
      [norm(addressText), norm(location.commune), norm(location.province), norm(location.region)].join('|'),
    [addressText, location.commune, location.province, location.region],
  );

  /** Si cambia región/provincia/comuna en paso 2, la ubicación geocodificada deja de ser válida. */
  useEffect(() => {
    if (step !== 2) return;
    setCoords(null);
    setSearchKey(null);
    setGeocodeState((s) => ({ ...s, error: null }));
  }, [location.region, location.province, location.commune, step]);

  const handleSelectDate = useCallback(
    (d: Date) => {
      setSelectedDate(d);
      if (!doctor) return;
      setLoadingSlots(true);
      setAgendaSlots([]);
      setSelectedSlot(null);
      setSlotsError('');
    },
    [doctor],
  );

  useEffect(() => {
    const load = async () => {
      if (!doctor || !selectedDate) return;
      setLoadingSlots(true);
      setSlotsError('');
      setSelectedSlot(null);
      setAgendaSlots([]);
      try {
        const dateParam = formatChileYmd(selectedDate);
        const path = `/agenda/slots?professionalId=${encodeURIComponent(doctor.id)}&date=${dateParam}`;
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[ScheduleModal] GET /agenda/slots — request', {
            path,
            professionalId: doctor.id,
            doctorName: doctor.name,
            dateSent: dateParam,
            selectedDateLocal: selectedDate.toString(),
            dayOfWeekChile: jsWeekdayChile(selectedDate),
          });
        }
        const res = await apiFetch<{ data: AgendaSlot[] }>(path);
        const slots = res.data || [];
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[ScheduleModal] GET /agenda/slots — response', {
            count: slots.length,
            slots: slots.map((s) => ({
              id: s.id,
              startAt: s.startAt,
              labelChile: formatChileTimeFromIso(s.startAt),
            })),
          });
        }
        setAgendaSlots(slots);
      } catch (e: any) {
        setAgendaSlots([]);
        setSlotsError(e.message || 'No se pudieron cargar los horarios.');
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [doctor, selectedDate]);

  const canGoStep2 = doctor && selectedDate && selectedSlot && !loadingSlots;
  const canSubmit =
    doctor &&
    selectedSlot &&
    location.region &&
    location.province &&
    location.commune &&
    addressText.trim().length >= 8 &&
    coords != null &&
    searchKey != null &&
    searchKey === currentAddressKey;

  const handleSearchLocation = async () => {
    const street = norm(addressText);
    const comuna = norm(location.commune);
    const provincia = norm(location.province);
    const region = norm(location.region);

    if (!region || !provincia || !comuna || !street) {
      setGeocodeState({
        loading: false,
        error: 'Completa región, provincia, comuna y dirección (calle y número) para buscar.',
      });
      return;
    }

    setGeocodeState({ loading: true, error: null });
    const fullAddress = buildChileGeocodeQuery({
      streetLine: street,
      commune: comuna,
      province: provincia,
      region,
    });
    const result = await geocodeChileAddressLine(fullAddress);
    if (!result.ok) {
      setCoords(null);
      setSearchKey(null);
      setGeocodeState({ loading: false, error: result.error });
      return;
    }
    const key = [street, comuna, provincia, region].join('|');
    setCoords({ lat: result.lat, lng: result.lng });
    setSearchKey(key);
    setGeocodeState({ loading: false, error: null });
  };

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
          addressText: addressText.trim(),
          region: location.region,
          province: location.province,
          city: location.province,
          commune: location.commune,
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
              <DateRangePicker
                selectedDate={selectedDate}
                onSelect={handleSelectDate}
                fromDayOffset={1}
                dayCount={14}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Hora disponible</label>
              {loadingSlots && selectedDate && (
                <div
                  className="flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-xl border border-sky-100/80 bg-sky-50/40 py-6"
                  aria-busy
                  aria-live="polite"
                >
                  <div
                    className="h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
                    role="status"
                  />
                  <p className="px-2 text-center text-sm text-gray-500">Cargando horarios disponibles...</p>
                </div>
              )}
              {!loadingSlots && !slotsError && agendaSlots.length === 0 && selectedDate && (
                <p className="text-xs text-gray-500">
                  {jsWeekdayChile(selectedDate) === 0 || jsWeekdayChile(selectedDate) === 6
                    ? 'Los médicos atienden de lunes a viernes. Elige un día hábil.'
                    : 'No hay cupos disponibles para esta fecha (mínimo 12 h de anticipación). Prueba otra fecha u horario.'}
                </p>
              )}
              {!loadingSlots && slotsError && <p className="text-xs text-red-600">{slotsError}</p>}
              {!loadingSlots && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {agendaSlots.map((s) => {
                    const label = formatChileTimeFromIso(s.startAt);
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
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirma el domicilio de la visita. El médico verá mapa y distancia antes de aceptar.
            </p>
            <LocationSelector
              region={location.region}
              province={location.province}
              commune={location.commune}
              onRegionChange={onLocationRegion}
              onProvinceChange={onLocationProvince}
              onCommuneChange={onLocationCommune}
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Dirección (calle y número) *</label>
              <input
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Ej: Los Alerces 123, depto 45"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearchLocation()}
              disabled={geocodeState.loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {geocodeState.loading ? 'Buscando ubicación...' : coords ? 'Volver a buscar ubicación' : 'Buscar ubicación'}
            </button>
            {geocodeState.error && <p className="text-xs text-amber-700">{geocodeState.error}</p>}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Mapa — puedes arrastrar el pin solo si necesitas afinar la ubicación
              </label>
              <MapaDireccion
                position={coords}
                onChangeCoords={(c) => {
                  setCoords(c);
                  if (c) setGeocodeState((s) => ({ ...s, error: null }));
                }}
              />
            </div>
            {!coords && !geocodeState.loading && (
              <p className="text-xs text-gray-500">
                Busca la dirección para confirmar la ubicación. El envío se habilita cuando haya coordenadas válidas
                (geocodificación o ajuste opcional del pin).
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
                setSearchKey(null);
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
              disabled={!canGoStep2 || loadingSlots}
              onClick={() => setStep(2)}
              className={`flex-1 rounded-lg px-4 py-2 font-medium text-white ${
                canGoStep2 && !loadingSlots ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-gray-300'
              }`}
            >
              {loadingSlots ? 'Cargando…' : 'Continuar'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit || submitting || geocodeState.loading}
              onClick={handleSubmit}
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
