'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  MEDICAL_SPECIALTIES,
  KNOWLEDGE_CREDENTIALS,
  decodeDoctorSpecialty,
  encodeDoctorSpecialty,
} from '@/data/medicalSpecialties';
import WeeklyAvailabilityGrid from '@/components/medico/WeeklyAvailabilityGrid';
import {
  DEFAULT_BUFFER_MINUTES,
  DEFAULT_SLOT_MINUTES,
  type WeeklyAvailabilityRange,
} from '@/lib/weeklyAvailability';

export default function DoctorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [standardFee, setStandardFee] = useState(40000);
  const [message, setMessage] = useState('');

  const [availability, setAvailability] = useState<WeeklyAvailabilityRange[]>([]);

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
        const decoded = decodeDoctorSpecialty(p.specialty);
        setSelectedCredentials(decoded.credentials);
        setSelectedSpecialties(decoded.areas);
      }

      if (scheduleRes && scheduleRes.data) {
        const { availability: avail, blockedSlots: blocked } = scheduleRes.data;

        if (Array.isArray(avail) && avail.length > 0) {
          setAvailability(
            avail.map((a) => ({
              dayOfWeek: a.dayOfWeek,
              startTime: a.startTime ?? '09:00',
              endTime: a.endTime ?? '18:00',
              slotDuration: a.slotDuration ?? DEFAULT_SLOT_MINUTES,
              bufferMinutes: DEFAULT_BUFFER_MINUTES,
            })),
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
    if (selectedSpecialties.length === 0) {
      setMessage('Selecciona al menos un área de conocimiento o experiencia.');
      setSaving(false);
      return;
    }
    try {
      await Promise.all([
        apiFetch('/doctor/me/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            specialty: encodeDoctorSpecialty(selectedCredentials, selectedSpecialties),
            baseFee: standardFee,
            selectedSpecialties,
            selectedCredentials,
          }),
        }),
        apiFetch('/scheduling/me', {
          method: 'PUT',
          body: JSON.stringify({
            availability,
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
          Define tus especialidades y tarifas para la plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando configuración...</p>
      ) : (
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          {/* Áreas de conocimiento */}
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-800">
              Área de conocimientos y experiencias
            </h2>
            <p className="mb-2 text-xs text-gray-500">
              Marca tu formación (puedes elegir más de una) y las áreas clínicas en las que atiendes.
            </p>

            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Formación
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {KNOWLEDGE_CREDENTIALS.map((c) => {
                const active = selectedCredentials.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleInArray(c, selectedCredentials, setSelectedCredentials)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Áreas clínicas
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_SPECIALTIES.map((s) => {
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

          {/* Agenda semanal interactiva */}
          <div className="border-t border-gray-100 pt-4">
            <WeeklyAvailabilityGrid value={availability} onChange={setAvailability} />

            {/* Bloques no disponibles */}
            <div className="mt-4 space-y-3 rounded-lg bg-sky-50 p-3">
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

          {message && <p className="text-sm text-emerald-700">{message}</p>}

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
