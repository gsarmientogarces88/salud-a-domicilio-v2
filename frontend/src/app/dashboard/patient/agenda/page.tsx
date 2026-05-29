'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import LocationSelector from '@/components/ui/LocationSelector';
import DateRangePicker from '@/components/medico/DateRangePicker';
import TimeSlots from '@/components/medico/TimeSlots';
import { getCoordsForCommune } from '@/data/coordsFallback';
import { formatLocalYmd } from '@/lib/formatLocalYmd';

const TIPOS_PROFESIONAL: { value: string; label: string }[] = [
  { value: 'Kinesiología', label: 'Kinesiología' },
  { value: 'Enfermería', label: 'Enfermería' },
  { value: 'Psicología', label: 'Psicología' },
  { value: 'Terapia Ocupacional', label: 'Terapia Ocupacional' },
  { value: 'Nutricionista', label: 'Nutricionista' },
];

interface SlotItem {
  id: string;
  startAt: string;
  endAt: string;
}

interface Professional {
  id: string;
  specialty: string;
  region: string | null;
  province: string | null;
  city?: string | null;
  commune: string | null;
  baseFee: number;
  coverageKm: number | null;
  user: { firstName: string; lastName: string };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [tipoProfesional, setTipoProfesional] = useState('Kinesiología');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingPros, setLoadingPros] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProfessionals = async () => {
    if (!region || !province || !commune) {
      setError('Selecciona región, provincia y comuna para buscar profesionales.');
      return;
    }
    setLoadingPros(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('type', tipoProfesional);
      params.set('region', region);
      params.set('province', province);
      params.set('city', province);
      params.set('commune', commune);
      const res = await apiFetch<{ data: Professional[] }>(`/professionals?${params}`);
      setProfessionals(res.data || []);
      setSelectedProfessional(null);
      setSelectedSlotId(null);
      setSlots([]);
    } catch (e: any) {
      setError(e.message || 'Error al cargar profesionales.');
    } finally {
      setLoadingPros(false);
    }
  };

  useEffect(() => {
    setSelectedProfessional(null);
    setSelectedSlotId(null);
    setSlots([]);
  }, [tipoProfesional]);

  useEffect(() => {
    setSelectedSlotId(null);
    setSlots([]);
  }, [selectedProfessional]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedProfessional || !selectedDate) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const dateStr = formatLocalYmd(selectedDate);
        const res = await apiFetch<{ data: SlotItem[] }>(
          `/agenda/slots?professionalId=${selectedProfessional.id}&date=${dateStr}`,
        );
        const list = (res.data || []).map((s) => ({
          ...s,
          startAt: typeof s.startAt === 'string' ? s.startAt : (s as any).startAt,
          endAt: typeof s.endAt === 'string' ? s.endAt : (s as any).endAt,
        }));
        setSlots(list);
        setSelectedSlotId(null);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedProfessional, selectedDate]);

  const slotTimes = slots.map((s) => {
    const d = new Date(s.startAt);
    return d.toTimeString().slice(0, 5);
  });

  const handleSlotSelect = (time: string) => {
    if (time === selectedSlotTime) {
      setSelectedSlotId(null);
      return;
    }
    const slot = slots.find((s) => {
      const t = new Date(s.startAt).toTimeString().slice(0, 5);
      return t === time;
    });
    setSelectedSlotId(slot?.id ?? null);
  };

  const selectedSlotTime = selectedSlotId
    ? (() => {
        const s = slots.find((x) => x.id === selectedSlotId);
        return s ? new Date(s.startAt).toTimeString().slice(0, 5) : null;
      })()
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!region || !province || !commune) {
      setError('Selecciona región, provincia y comuna.');
      return;
    }
    if (!selectedProfessional) {
      setError('Selecciona un profesional.');
      return;
    }
    if (!selectedDate || !selectedSlotId) {
      setError('Selecciona fecha y hora.');
      return;
    }
    if (!street.trim()) {
      setError('Ingresa la calle y número.');
      return;
    }

    const addressText = `${street.trim()}, ${commune}, ${province}`;
    const { lat, lng } = getCoordsForCommune(commune);

    setSubmitting(true);
    try {
      const res = await apiFetch<{ data: { id: string; status: string }; message: string }>(
        '/agenda/requests',
        {
          method: 'POST',
          body: JSON.stringify({
            professionalId: selectedProfessional.id,
            slotId: selectedSlotId,
            addressText,
            region,
            province,
            city: province,
            commune,
            lat,
            lng,
            notes: notes.trim() || undefined,
          }),
        },
      );
      router.push(`/dashboard/patient/agenda/estado/${res.data.id}`);
    } catch (e: any) {
      setError(e.message || 'Error al enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span className="text-3xl">📅</span>
          Agenda a Domicilio
        </h1>
        <p className="text-gray-600">
          Elige el tipo de profesional, un horario y tu dirección. El pago se realizará solo cuando el
          profesional confirme la solicitud.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tipo de profesional */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de profesional *
          </label>
          <select
            value={tipoProfesional}
            onChange={(e) => setTipoProfesional(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {TIPOS_PROFESIONAL.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ubicación */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Ubicación de la visita *
          </label>
          <LocationSelector
            region={region}
            province={province}
            commune={commune}
            onRegionChange={setRegion}
            onProvinceChange={setProvince}
            onCommuneChange={setCommune}
          />
        </div>

        <div className="mb-6 flex items-end gap-3">
          <button
            type="button"
            onClick={loadProfessionals}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Buscar profesionales
          </button>
          {loadingPros && <span className="text-sm text-gray-500">Buscando...</span>}
        </div>

        {/* Lista profesionales */}
        {professionals.length > 0 && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Profesional *
            </label>
            <div className="space-y-2">
              {professionals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProfessional(p)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left ${
                    selectedProfessional?.id === p.id
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-sky-200'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {p.user.firstName} {p.user.lastName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {p.specialty} · {p.commune || ''} · Cobertura {p.coverageKm ?? 15} km
                    </p>
                  </div>
                  <span className="text-sm font-medium text-sky-600">
                    $ {(p.baseFee || 0).toLocaleString('es-CL')} CLP
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fecha y hora */}
        {selectedProfessional && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha *
              </label>
              <DateRangePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hora disponible *
              </label>
              <TimeSlots
                selectedTime={selectedSlotTime}
                onSelect={handleSlotSelect}
                occupied={[]}
                slots={slotTimes}
              />
              {loadingSlots && (
                <p className="mt-2 text-xs text-gray-500">Cargando horarios...</p>
              )}
              {!loadingSlots && selectedDate && slots.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No hay horas disponibles para este día. Prueba otra fecha.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dirección (calle + número) */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Calle y número *
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Ej: Av. O'Higgins 1234"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>

        {/* Motivo (opcional) */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Motivo de la consulta (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Breve descripción del motivo de la visita"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Solicitud enviada. Esperando confirmación del profesional (máx. 20 min). No se te cobrará
          hasta que acepte.
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedProfessional || !selectedSlotId || !street.trim()}
          className="mt-6 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  );
}
