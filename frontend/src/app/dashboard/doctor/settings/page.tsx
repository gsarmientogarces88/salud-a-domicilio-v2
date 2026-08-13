'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { MEDICAL_SPECIALTIES, parseSpecialtyList } from '@/data/medicalSpecialties';

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
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [coverageKm, setCoverageKm] = useState(5);
  const [standardFee, setStandardFee] = useState(40000);
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
        if (typeof p.coverageKm === 'number' && p.coverageKm > 0) {
          setCoverageKm(p.coverageKm);
        }
        const listed = parseSpecialtyList(p.specialty).filter((s) =>
          (MEDICAL_SPECIALTIES as readonly string[]).includes(s),
        );
        const specialist =
          listed.length > 0 && listed.some((s) => s.toLowerCase() !== 'medicina general');
        setIsSpecialist(specialist);
        setSelectedSpecialties(
          specialist ? listed : listed.length ? listed : [MEDICAL_SPECIALTIES[0]],
        );
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
    if (!Number.isFinite(standardFee) || standardFee <= 0) {
      setMessage('Debe configurar el valor de la consulta a domicilio (mayor a $0).');
      setSaving(false);
      return;
    }
    if (isSpecialist && selectedSpecialties.length === 0) {
      setMessage('Selecciona al menos un área de conocimiento.');
      setSaving(false);
      return;
    }
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
            specialty: isSpecialist
              ? selectedSpecialties.join(', ')
              : MEDICAL_SPECIALTIES[0],
            baseFee: standardFee,
            coverageKm,
            selectedSpecialties: isSpecialist ? selectedSpecialties : [MEDICAL_SPECIALTIES[0]],
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
          Define tus especialidades, cobertura y tarifas para la plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando configuración...</p>
      ) : (
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          {/* Especialista */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">¿Eres especialista?</h2>
            <div className="flex gap-2">
              {[
                { label: 'Sí', value: true },
                { label: 'No', value: false },
              ].map((opt) => {
                const active = isSpecialist === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setIsSpecialist(opt.value);
                      if (!opt.value) {
                        setSelectedSpecialties([MEDICAL_SPECIALTIES[0]]);
                      }
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      active
                        ? 'bg-sky-600 text-white'
                        : 'bg-salud-light text-sky-800 hover:bg-sky-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Especialidades */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">
              Especialidades / Conocimientos
            </h2>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_SPECIALTIES.map((s) => {
                const active = selectedSpecialties.includes(s);
                const lockedGeneral = !isSpecialist && s === MEDICAL_SPECIALTIES[0];
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!isSpecialist && !lockedGeneral}
                    onClick={() => {
                      if (!isSpecialist) return;
                      toggleInArray(s, selectedSpecialties, setSelectedSpecialties);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? 'bg-sky-600 text-white'
                        : 'bg-salud-light text-sky-800 hover:bg-sky-100'
                    } ${!isSpecialist && !lockedGeneral ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {!isSpecialist && (
              <p className="mt-2 text-xs text-gray-500">
                Si no eres especialista, tu área queda como Medicina general.
              </p>
            )}
          </div>

          {/* Cobertura */}
          <div className="max-w-sm">
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
            <p className="mt-1 text-xs text-gray-500">
              Distancia máxima desde tu ubicación para atender por georreferencia.
            </p>
          </div>

          {/* Tarifas */}
          <div className="max-w-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Tarifas</h2>
            <label className="mb-1 block text-xs text-gray-600">
              Valor consulta a domicilio (CLP) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={standardFee}
              onChange={(e) => setStandardFee(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Obligatorio para Agenda Médico a Domicilio. Debe ser mayor a $0.
            </p>
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

