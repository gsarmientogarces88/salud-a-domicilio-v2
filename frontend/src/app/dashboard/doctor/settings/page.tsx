'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const SPECIALTIES = [
  'Medicina General',
  'Pediatría',
  'Geriatría',
  'Salud Mental',
  'Cardiología básica',
  'Urgencias domiciliarias',
  'Manejo crónicos',
  'Cuidados paliativos',
] as const;

const SERVICES = [
  'Suturas',
  'ECG portátil',
  'Ecografía',
  'Certificados',
  'Licencias médicas',
  'Nebulización',
  'Infiltraciones',
] as const;

const DAYS = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
] as const;

export default function DoctorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [coverageKm, setCoverageKm] = useState(5);
  const [coverageCommunes, setCoverageCommunes] = useState<string>('');
  const [standardFee, setStandardFee] = useState(40000);
  const [urgentSurcharge, setUrgentSurcharge] = useState(15000);
  const [message, setMessage] = useState('');

  type AvailabilityRow = {
    dayOfWeek: number;
    enabled: boolean;
    startTime: string;
    endTime: string;
    slotDuration: number;
    bufferMinutes: number;
  };

  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>(
    DAYS.map((d) => ({
      dayOfWeek: d.value,
      enabled: d.value >= 1 && d.value <= 5, // Lunes a Viernes por defecto
      startTime: '09:00',
      endTime: '18:00',
      slotDuration: 30,
      bufferMinutes: 15,
    })),
  );

  const [blockedSlots, setBlockedSlots] = useState<
    { date: string; startTime: string; endTime: string; reason: string }[]
  >([]);

  const toggleInArray = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, scheduleRes] = await Promise.all([
        apiFetch<{ data: any }>('/doctor/me'),
        apiFetch<{ data: { availability: any[]; blockedSlots: any[] } }>('/scheduling/me').catch(
          () => null,
        ),
      ]);

      const p = profileRes.data;
      if (p) {
        setStandardFee(p.baseFee || 40000);
      }

      if (scheduleRes && scheduleRes.data) {
        const { availability, blockedSlots: blocked } = scheduleRes.data;

        if (Array.isArray(availability) && availability.length > 0) {
          setAvailabilityRows((prev) =>
            prev.map((row) => {
              const found = availability.find((a) => a.dayOfWeek === row.dayOfWeek);
              if (!found) return { ...row, enabled: false };
              return {
                ...row,
                enabled: true,
                startTime: found.startTime ?? row.startTime,
                endTime: found.endTime ?? row.endTime,
                slotDuration: found.slotDuration ?? row.slotDuration,
                bufferMinutes: found.bufferMinutes ?? row.bufferMinutes,
              };
            }),
          );
        }

        if (Array.isArray(blocked)) {
          setBlockedSlots(
            blocked.map((b) => ({
              date: b.date ? new Date(b.date).toISOString().slice(0, 10) : '',
              startTime: b.startTime ?? '09:00',
              endTime: b.endTime ?? '10:00',
              reason: b.reason ?? '',
            })),
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const availabilityPayload = availabilityRows
        .filter((r) => r.enabled)
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          slotDuration: r.slotDuration,
          bufferMinutes: r.bufferMinutes,
        }));

      await Promise.all([
        apiFetch('/doctor/me/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            specialty: selectedSpecialties[0] || 'Medicina General',
            baseFee: standardFee,
            coverageKm,
            coverageCommunes,
            selectedSpecialties,
            selectedServices,
            urgentSurcharge,
          }),
        }),
        apiFetch('/scheduling/me', {
          method: 'PUT',
          body: JSON.stringify({
            availability: availabilityPayload,
            blockedSlots,
          }),
        }),
      ]);
      setMessage('Configuración guardada correctamente.');
    } catch (e: any) {
      setMessage(e.message || 'Error al guardar configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración profesional</h1>
        <p className="text-sm text-gray-600">
          Define tus especialidades, servicios, cobertura y tarifas para la plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando configuración...</p>
      ) : (
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          {/* Especialidades */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">
              Especialidades / Conocimientos
            </h2>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const active = selectedSpecialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleInArray(s, selectedSpecialties, setSelectedSpecialties)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? 'bg-sky-600 text-white'
                        : 'bg-salud-light text-sky-800 hover:bg-sky-100'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Servicios */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Servicios que realizas</h2>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const active = selectedServices.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleInArray(s, selectedServices, setSelectedServices)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cobertura */}
          <div className="grid gap-4 md:grid-cols-[1fr,2fr]">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-800">Cobertura</h2>
              <label className="mb-1 block text-xs text-gray-600">Radio (km)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={coverageKm}
                onChange={(e) => setCoverageKm(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Comunas (separadas por coma)
              </label>
              <textarea
                value={coverageCommunes}
                onChange={(e) => setCoverageCommunes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej: San Miguel, Ñuñoa, Providencia"
              />
            </div>
          </div>

          {/* Tarifas */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-800">Tarifas</h2>
              <label className="mb-1 block text-xs text-gray-600">Consulta estándar (CLP)</label>
              <input
                type="number"
                min={10000}
                value={standardFee}
                onChange={(e) => setStandardFee(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Recargo urgencia/nocturno (CLP)
              </label>
              <input
                type="number"
                min={0}
                value={urgentSurcharge}
                onChange={(e) => setUrgentSurcharge(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Agenda y horarios */}
          <div className="border-t border-gray-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Agenda y horarios disponibles</h2>
            <p className="mb-4 text-xs text-gray-500">
              Define en qué días y horarios puedes recibir pacientes de forma agendada. Los horarios se
              usarán para generar los bloques disponibles para reserva.
            </p>

            <div className="mb-4 space-y-2">
              {availabilityRows.map((row, idx) => {
                const dayLabel = DAYS.find((d) => d.value === row.dayOfWeek)?.label ?? 'Día';
                return (
                  <div
                    key={row.dayOfWeek}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-salud-light/40 px-3 py-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          setAvailabilityRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, enabled: e.target.checked } : r,
                            ),
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {dayLabel}
                    </label>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Inicio</span>
                      <input
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          setAvailabilityRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, startTime: e.target.value } : r,
                            ),
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1"
                      />
                      <span>Fin</span>
                      <input
                        type="time"
                        value={row.endTime}
                        onChange={(e) =>
                          setAvailabilityRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, endTime: e.target.value } : r,
                            ),
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1"
                      />
                      <span>Bloque</span>
                      <input
                        type="number"
                        min={10}
                        max={180}
                        value={row.slotDuration}
                        onChange={(e) =>
                          setAvailabilityRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, slotDuration: Number(e.target.value) || r.slotDuration }
                                : r,
                            ),
                          )
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1"
                      />
                      <span>min</span>
                      <span>Buffer</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={row.bufferMinutes}
                        onChange={(e) =>
                          setAvailabilityRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, bufferMinutes: Number(e.target.value) || r.bufferMinutes }
                                : r,
                            ),
                          )
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1"
                      />
                      <span>min</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bloques no disponibles */}
            <div className="space-y-3 rounded-lg bg-sky-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-800">Bloques no disponibles</h3>
                <button
                  type="button"
                  onClick={() =>
                    setBlockedSlots((prev) => [
                      ...prev,
                      {
                        date: new Date().toISOString().slice(0, 10),
                        startTime: '09:00',
                        endTime: '10:00',
                        reason: '',
                      },
                    ])
                  }
                  className="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700"
                >
                  + Agregar bloqueo
                </button>
              </div>

              {blockedSlots.length === 0 ? (
                <p className="text-xs text-gray-600">
                  No tienes bloques específicos bloqueados. Usa esta sección para excluir feriados,
                  vacaciones u otros horarios puntuales.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {blockedSlots.map((b, idx) => (
                    <div
                      key={`${b.date}-${idx}`}
                      className="flex flex-wrap items-center gap-2 rounded border border-sky-100 bg-white px-2 py-1"
                    >
                      <input
                        type="date"
                        value={b.date}
                        onChange={(e) =>
                          setBlockedSlots((prev) =>
                            prev.map((slot, i) =>
                              i === idx ? { ...slot, date: e.target.value } : slot,
                            ),
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1"
                      />
                      <span>de</span>
                      <input
                        type="time"
                        value={b.startTime}
                        onChange={(e) =>
                          setBlockedSlots((prev) =>
                            prev.map((slot, i) =>
                              i === idx ? { ...slot, startTime: e.target.value } : slot,
                            ),
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={b.endTime}
                        onChange={(e) =>
                          setBlockedSlots((prev) =>
                            prev.map((slot, i) =>
                              i === idx ? { ...slot, endTime: e.target.value } : slot,
                            ),
                          )
                        }
                        className="rounded border border-gray-300 px-2 py-1"
                      />
                      <input
                        type="text"
                        placeholder="Motivo (opcional)"
                        value={b.reason}
                        onChange={(e) =>
                          setBlockedSlots((prev) =>
                            prev.map((slot, i) =>
                              i === idx ? { ...slot, reason: e.target.value } : slot,
                            ),
                          )
                        }
                        className="min-w-[120px] flex-1 rounded border border-gray-300 px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setBlockedSlots((prev) => prev.filter((_slot, i) => i !== idx))
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {message && (
            <p className="text-sm text-emerald-700">
              {message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

