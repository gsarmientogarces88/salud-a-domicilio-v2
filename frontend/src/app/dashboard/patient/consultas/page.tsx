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
  commune?: string | null;
  totalAmount: number;
  requestedAt?: string;
  estimatedArrivalAt?: string | null;
  arrivedAt?: string | null;
  doctorName?: string | null;
  doctorSpecialtyLabel?: string | null;
  distanceKm?: number | null;
  allowedRadiusKm?: number | null;
  paymentMethod?: string | null;
  serviceType?: 'IMMEDIATE' | 'SCHEDULED' | 'WEIGHT_PROGRAM';
  serviceTypeLabel?: string;
  receiptStatus?: 'AVAILABLE' | 'PENDING';
  receiptUploadedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  doctor?: { user: { firstName: string; lastName: string } };
}

type HistoryFilter = 'ALL' | 'COMPLETED' | 'CANCELLED' | 'PENDING';

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/** Badge informativo por tipo de servicio (sin filtro superior en UI). */
function getServiceTypeVisual(serviceType?: 'IMMEDIATE' | 'SCHEDULED' | 'WEIGHT_PROGRAM') {
  if (serviceType === 'WEIGHT_PROGRAM') {
    return {
      label: 'Programa Médico Baja de Peso',
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    };
  }
  if (serviceType === 'SCHEDULED') {
    return {
      label: 'Agenda Médico a Domicilio',
      className: 'bg-sky-50 text-sky-800 ring-sky-200',
    };
  }
  return {
    label: 'Médico a Domicilio Inmediato 🚨',
    className: 'bg-orange-50 text-orange-800 ring-orange-200',
  };
}

function resolveServiceType(s: Service): 'IMMEDIATE' | 'SCHEDULED' | 'WEIGHT_PROGRAM' {
  if (s.serviceType) return s.serviceType;
  if (s.type === 'SCHEDULED') return 'SCHEDULED';
  if (s.description?.toLowerCase().includes('baja de peso')) return 'WEIGHT_PROGRAM';
  return 'IMMEDIATE';
}

function serviceTypeDisplayLabel(s: Service): string {
  if (s.serviceTypeLabel?.trim()) return s.serviceTypeLabel;
  const st = resolveServiceType(s);
  const v = getServiceTypeVisual(st);
  if (st === 'IMMEDIATE' && !s.description?.trim()) return 'Consulta médica';
  return v.label;
}

function ConsultasContent() {
  const searchParams = useSearchParams();
  const servicioParam = searchParams.get('servicio');
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
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
    setHistoryError('');
    try {
      const res = await apiFetch<{ data: Service[] }>('/services/me');
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setServices([]);
      setHistoryError(e instanceof Error ? e.message : 'No se pudo cargar el historial de consultas.');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = services.filter((s) => {
    const statusMatch =
      historyFilter === 'ALL' ||
      (historyFilter === 'COMPLETED' && s.status === 'COMPLETED') ||
      (historyFilter === 'CANCELLED' && s.status === 'CANCELLED') ||
      (historyFilter === 'PENDING' &&
        ['PENDING', 'QUEUED', 'ACCEPTED', 'IN_PROGRESS'].includes(s.status));

    if (!statusMatch) return false;

    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    const doctorText =
      s.doctorName ||
      (s.doctor?.user ? `Dr. ${s.doctor.user.firstName} ${s.doctor.user.lastName}` : '');
    return (
      s.description.toLowerCase().includes(q) ||
      (s.commune || '').toLowerCase().includes(q) ||
      doctorText.toLowerCase().includes(q)
    );
  });

  const downloadReceipt = async (serviceId: string) => {
    setDownloadingReceiptId(serviceId);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}/services/${serviceId}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo descargar la boleta');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `boleta-${serviceId}.pdf`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err: any) {
      alert(err?.message || 'No se pudo descargar la boleta');
    } finally {
      setDownloadingReceiptId(null);
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
    let requestServiceType: 'IMMEDIATE' | 'SCHEDULED' | 'WEIGHT_PROGRAM' | undefined;
    if (soloAgendado && selectedDate && selectedTime) {
      const [h, m] = selectedTime.split(':').map((v) => parseInt(v, 10));
      const d = new Date(selectedDate);
      d.setHours(h || 0, m || 0, 0, 0);
      scheduledAt = d.toISOString();
    }
    if (selectedServicio?.label?.toLowerCase().includes('baja de peso')) {
      requestServiceType = 'WEIGHT_PROGRAM';
    } else if (soloAgendado || form.type === 'SCHEDULED') {
      requestServiceType = 'SCHEDULED';
    } else {
      requestServiceType = 'IMMEDIATE';
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
            serviceType: requestServiceType,
          }),
        });
      } else {
        await apiFetch('/services', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            type: form.type,
            description: desc,
            serviceType: requestServiceType,
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

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {soloAgendado && selectedServicio ? `Agendar ${selectedServicio.label}` : 'Historial de Consultas'}
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

      {/* Historial: siempre visible (también en flujos solo-agendados) para no “perder” solicitudes previas. */}
      {historyError && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {historyError}
        </div>
      )}

      {!historyError && services.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
          No tienes atenciones médicas registradas aún.
        </p>
      ) : !historyError ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'PENDING', label: 'Pendientes' },
                    { id: 'COMPLETED', label: 'Completadas' },
                    { id: 'CANCELLED', label: 'Canceladas' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHistoryFilter(opt.id as HistoryFilter)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        historyFilter === opt.id
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="lg:flex lg:justify-end">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar por médico, motivo o comuna"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 lg:max-w-sm"
                />
                </div>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-gray-500">
                No hay atenciones que coincidan con tu búsqueda o filtro.
              </p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredHistory.map((s) => {
                  const doctorName =
                    s.doctorName ||
                    (s.doctor?.user
                      ? `Dr. ${s.doctor.user.firstName} ${s.doctor.user.lastName}`
                      : 'Profesional por asignar');
                  const specialty = s.doctorSpecialtyLabel?.trim() || 'No informado';
                  const distanceText =
                    typeof s.distanceKm === 'number'
                      ? `Distancia: ${s.distanceKm.toFixed(1)} km`
                      : s.allowedRadiusKm
                        ? `Dentro del radio de ${s.allowedRadiusKm} km`
                        : 'Distancia no disponible';
                  const llegadaRaw = s.arrivedAt || s.estimatedArrivalAt;
                  const llegadaText = llegadaRaw ? formatDateTime(llegadaRaw) : 'No registrada';

                  return (
                    <article
                      key={s.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-sky-50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-gray-900">{s.description || 'Atención médica'}</h3>
                        <StatusBadge status={s.status} />
                      </div>

                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getServiceTypeVisual(resolveServiceType(s)).className}`}
                        >
                          {serviceTypeDisplayLabel(s)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="font-semibold text-gray-900">{doctorName}</p>
                        <p className="text-sm text-gray-600">{specialty}</p>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-gray-700">
                          <span className="font-medium">Fecha solicitud:</span> {formatDateTime(s.requestedAt || s.createdAt)}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Hora llegada:</span> {llegadaText}
                        </p>
                        <p className="text-gray-700 sm:col-span-2">
                          <span className="font-medium">Ubicación:</span> {s.address}
                          {s.commune ? `, ${s.commune}` : ''}
                        </p>
                        <p className="text-gray-700 sm:col-span-2">
                          <span className="font-medium">Distancia:</span> {distanceText}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Pago:</span> ${(s.totalAmount ?? 0).toLocaleString('es-CL')} CLP
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Medio:</span> {s.paymentMethod || 'Pendiente'}
                        </p>
                      </div>

                      {s.notes && (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Observaciones finales</p>
                          <p className="mt-1 text-sm text-gray-700">{s.notes}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {s.receiptStatus === 'AVAILABLE' ? (
                          <button
                            type="button"
                            onClick={() => downloadReceipt(s.id)}
                            disabled={downloadingReceiptId === s.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {downloadingReceiptId === s.id ? 'Descargando boleta...' : 'Descargar boleta'}
                          </button>
                        ) : (
                          <span className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                            Boleta pendiente
                          </span>
                        )}
                        <Link
                          href={`/dashboard/patient/medico/urgente/estado?serviceId=${s.id}`}
                          className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
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
