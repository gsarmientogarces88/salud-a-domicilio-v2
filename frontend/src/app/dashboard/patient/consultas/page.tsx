'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import DateRangePicker from '@/components/medico/DateRangePicker';
import TimeSlots from '@/components/medico/TimeSlots';
import LocationSelector from '@/components/ui/LocationSelector';

const SERVICIOS: Record<string, { label: string; icon: string }> = {
  medico: { label: 'Médico', icon: '👨‍⚕️' },
  nutricionista: { label: 'Nutricionista', icon: '🥗' },
  kinesiologo: { label: 'Kinesiólogo', icon: '🩺' },
  enfermeria: { label: 'Enfermería', icon: '💉' },
  psicologo: { label: 'Psicólogo', icon: '🧠' },
  terapeuta: { label: 'Terapeuta Ocupacional', icon: '🧩' },
  examenes: { label: 'Exámenes a Domicilio', icon: '🔬' },
};

// Servicios que solo permiten reserva agendada (sin urgencia inmediata)
const SOLO_AGENDADOS = new Set(['nutricionista', 'kinesiologo', 'enfermeria', 'psicologo', 'terapeuta']);

interface Service {
  id: string;
  type: string;
  status: string;
  description: string;
  address: string;
  totalAmount: number;
  createdAt: string;
  doctor?: { user: { firstName: string; lastName: string } };
}

function ConsultasContent() {
  const searchParams = useSearchParams();
  const servicioParam = searchParams.get('servicio');
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    type: 'URGENT',
    description: '',
    address: '',
    commune: '',
    reference: '',
  });
  const [error, setError] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loadingPros, setLoadingPros] = useState(false);
  const [hasSearchedPros, setHasSearchedPros] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const selectedServicio = servicioParam ? SERVICIOS[servicioParam] : null;
  const soloAgendado = servicioParam ? SOLO_AGENDADOS.has(servicioParam) : false;

  const load = async () => {
    try {
      const res = await apiFetch<{ data: Service[] }>('/services/me');
      setServices(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedServicio && !showForm) setShowForm(true);
  }, [selectedServicio, showForm]);

  // Si el servicio seleccionado solo permite reservas agendadas,
  // forzamos el tipo SCHEDULED en el formulario.
  useEffect(() => {
    if (soloAgendado) {
      setForm((prev) => ({ ...prev, type: 'SCHEDULED' }));
    }
  }, [soloAgendado]);

  const loadProfessionals = async () => {
    if (!soloAgendado) return;
    if (!region || !province || !commune) {
      setError('Selecciona región, provincia y comuna para buscar profesionales.');
      return;
    }
    setHasSearchedPros(true);
    setLoadingPros(true);
    setError('');
    try {
      const params = new URLSearchParams();
      // Usamos el label del servicio como tipo de profesional (Nutricionista, Kinesiólogo, etc.)
      if (selectedServicio) params.set('type', selectedServicio.label);
      params.set('region', region);
      params.set('province', province);
      params.set('city', province);
      params.set('commune', commune);

      const res = await apiFetch<{ data: any[] }>(`/professionals?${params.toString()}`);
      setProfessionals(res.data || []);
      if (res.data.length === 0) {
        setSelectedProfessional(null);
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar profesionales.');
    } finally {
      setLoadingPros(false);
    }
  };

  useEffect(() => {
    // limpiamos selección de fecha/hora al cambiar profesional
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
  }, [selectedProfessional]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!soloAgendado || !selectedProfessional || !selectedDate) return;
      try {
        const dateParam = selectedDate.toISOString().split('T')[0];
        const res = await apiFetch<{ data: { slots: string[] } }>(
          `/professionals/${selectedProfessional.id}/availability?date=${dateParam}`,
        );
        setAvailableSlots(res.data.slots || []);
      } catch {
        setAvailableSlots([]);
      }
    };

    loadSlots();
  }, [soloAgendado, selectedProfessional, selectedDate]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Para servicios solo-agendados exigimos profesional + fecha + hora seleccionadas
    if (soloAgendado) {
      if (!selectedProfessional) {
        setError('Debes seleccionar un profesional para agendar.');
        return;
      }
      if (!selectedDate || !selectedTime) {
        setError('Debes seleccionar una fecha y una hora para agendar.');
        return;
      }
    }

    const desc = selectedServicio ? `${selectedServicio.label}: ${form.description}` : form.description;

    let scheduledAt: string | undefined;
    if (soloAgendado && selectedDate && selectedTime) {
      const [h, m] = selectedTime.split(':').map((v) => parseInt(v, 10));
      const d = new Date(selectedDate);
      d.setHours(h || 0, m || 0, 0, 0);
      scheduledAt = d.toISOString();
    }

    try {
      if (soloAgendado && selectedProfessional && scheduledAt) {
        // Usamos el flujo de agenda con verificación de disponibilidad
        await apiFetch('/scheduling/book', {
          method: 'POST',
          body: JSON.stringify({
            professionalId: selectedProfessional.id,
            description: desc,
            address: form.address,
            commune,
            province,
            city: province,
            scheduledAt,
          }),
        });
      } else {
        await apiFetch('/services', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            type: form.type,
            description: desc,
          }),
        });
      }
      setShowForm(false);
      setForm({ type: 'URGENT', description: '', address: '', commune: '', reference: '' });
      setSelectedDate(null);
      setSelectedTime(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePay = async (serviceId: string) => {
    try {
      await apiFetch(`/payments/${serviceId}/create`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'mercadopago' }),
      });
      await apiFetch(`/payments/${serviceId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (serviceId: string) => {
    try {
      await apiFetch(`/services/${serviceId}`, { method: 'DELETE', body: JSON.stringify({}) });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {soloAgendado && selectedServicio ? `Agendar ${selectedServicio.label}` : 'Mis Solicitudes'}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border bg-white p-6 shadow-sm"
        >
          {selectedServicio && (
            <p className="mb-3 text-sm text-gray-600">
              Tipo de servicio: <strong>{selectedServicio.label}</strong>
            </p>
          )}
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {/* Tipo de solicitud: para algunos servicios solo se permite agendar */}
          {soloAgendado ? (
            <div className="mb-3 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-800">
              {servicioParam === 'nutricionista'
                ? 'Nutrición: solo atención agendada (no urgencias).'
                : 'Este tipo de profesional solo permite reservas agendadas. No está disponible la opción de atención urgente inmediata.'}
            </div>
          ) : (
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2"
            >
              <option value="URGENT">🚨 Urgencia (tarifa fija)</option>
              <option value="SCHEDULED">📅 Agendada</option>
            </select>
          )}

          {soloAgendado && (
            <div className="mb-4 space-y-4 rounded-lg bg-salud-light/40 p-4">
              {/* Filtro ubicación paciente */}
              <LocationSelector
                region={region}
                province={province}
                commune={commune}
                onRegionChange={setRegion}
                onProvinceChange={setProvince}
                onCommuneChange={setCommune}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-600">
                  Se mostrarán primero profesionales de tu misma comuna, luego provincia y finalmente región.
                </p>
                <button
                  type="button"
                  onClick={loadProfessionals}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
                >
                  Buscar profesionales
                </button>
              </div>

              {/* Lista de profesionales */}
              <div className="space-y-2">
                {loadingPros && (
                  <p className="text-xs text-gray-500">Buscando profesionales disponibles...</p>
                )}
                {!loadingPros && hasSearchedPros && professionals.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No se encontraron profesionales para la ubicación seleccionada.
                  </p>
                )}
                {professionals.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfessional(p)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${
                      selectedProfessional?.id === p.id
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 bg-white hover:border-sky-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {p.user.firstName} {p.user.lastName}
                      </div>
                      <div className="text-[11px] text-gray-600">{p.specialty}</div>
                      <div className="text-[11px] text-gray-500">
                        📍 {p.commune || 'Sin comuna'},{' '}
                        {p.province || p.city || 'Sin provincia'}, {p.region || 'Sin región'}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-sky-600">
                      {selectedProfessional?.id === p.id ? 'Seleccionado' : 'Seleccionar'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Fecha y hora para el profesional seleccionado */}
              {selectedProfessional && (
                <div className="mt-4 space-y-4 rounded-lg bg-white p-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Fecha</label>
                    <DateRangePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Hora disponible</label>
                    <TimeSlots
                      selectedTime={selectedTime}
                      onSelect={setSelectedTime}
                      occupied={[]}
                      slots={availableSlots}
                    />
                    {selectedDate && availableSlots.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        No hay horas disponibles para este día. Prueba con otra fecha.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <textarea
            placeholder="Motivo de consulta (opcional)"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2"
            rows={3}
          />
          <input
            placeholder="Dirección"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2"
            required
          />
          {soloAgendado ? (
            <input
              placeholder="Referencia (opcional)"
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
              className="mb-4 w-full rounded-lg border px-4 py-2"
            />
          ) : (
            <input
              placeholder="Comuna"
              value={form.commune}
              onChange={(e) => set('commune', e.target.value)}
              className="mb-4 w-full rounded-lg border px-4 py-2"
            />
          )}
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-6 py-2 text-white hover:bg-sky-700"
          >
            Enviar Solicitud
          </button>
        </form>
      )}

      {/* Historial de solicitudes solo se muestra cuando NO es un servicio solo-agendado */}
      {!soloAgendado &&
        (services.length === 0 ? (
          <p className="text-gray-500">No tienes solicitudes aún.</p>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {s.type === 'URGENT' ? '🚨' : '📅'} {s.description}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {s.address} · ${s.totalAmount.toLocaleString('es-CL')} CLP
                  </p>
                  {s.doctor && (
                    <p className="text-sm text-gray-400">
                      Dr. {s.doctor.user.firstName} {s.doctor.user.lastName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {s.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(s.id)}
                      className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 hover:bg-red-200"
                    >
                      Cancelar
                    </button>
                  )}
                  {s.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handlePay(s.id)}
                      className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
                    >
                      💳 Pagar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default function ConsultasPage() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <ConsultasContent />
    </Suspense>
  );
}
