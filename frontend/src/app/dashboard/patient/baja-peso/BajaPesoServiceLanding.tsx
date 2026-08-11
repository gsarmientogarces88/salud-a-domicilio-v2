'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import DoctorList, { DoctorCard } from '@/components/medico/DoctorList';

const BAJA_PESO_SYMPTOMS = [
  { emoji: '⚖️', label: 'Sobrepeso' },
  { emoji: '🍔', label: 'Hábitos alimenticios inadecuados' },
  { emoji: '🧬', label: 'Problemas hormonales' },
  { emoji: '🍭', label: 'Resistencia a la insulina' },
  { emoji: '🩺', label: 'Control metabólico' },
  { emoji: '💤', label: 'Ansiedad por comer' },
  { emoji: '🍽️', label: 'Trastornos alimentarios' },
  { emoji: '🏃', label: 'Falta de actividad física' },
  { emoji: '📉', label: 'Dificultad para bajar de peso' },
  { emoji: '📈', label: 'Aumento de peso reciente' },
  { emoji: '➕', label: 'Otros (evaluación médica)' },
];

/** Mismo criterio de tipo que Agenda Médico a Domicilio (`/professionals?type=...`). */
const BAJA_PESO_PROFESSIONAL_TYPE = 'Medicina General';

export default function BajaPesoServiceLanding() {
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('forAgenda', '1');
        params.set('type', BAJA_PESO_PROFESSIONAL_TYPE);

        const res = await apiFetch<{ data: any[] }>(`/professionals?${params.toString()}`);
        if (cancelled) return;

        const items: DoctorCard[] = (res.data || []).map((p) => ({
          id: p.id,
          name: `${p.user.firstName} ${p.user.lastName}`,
          specialty: p.specialty,
          region: p.region,
          province: p.province ?? p.city,
          city: p.city ?? p.province,
          commune: p.commune,
          availabilityLabel: 'Agenda disponible',
          ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 4.8,
          ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 24,
          acceptsWebpay: p.acceptsWebpay !== false,
          acceptsIsapreBono: p.acceptsIsapreBono !== false,
        }));
        setDoctors(items);
      } catch (e: any) {
        if (!cancelled) {
          setDoctors([]);
          setError(e.message || 'Error al cargar médicos.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDoctors();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="agendar-baja-peso" className="relative overflow-hidden rounded-2xl border border-[var(--color-verde-borde)] bg-white p-6 shadow-sm sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #bbf7d0 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, #dcfce7 0%, transparent 40%)`,
        }}
      />

      <div className="relative z-10 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-texto-1)]">
            Solicitar consulta a domicilio
          </h3>
          <p className="mt-1 text-sm text-[var(--color-texto-3)]">
            Una sola opción: agenda con un médico orientado a control de peso. La dirección se confirma en el mapa al
            elegir horario (sin región / provincia / comuna).
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-texto-4)]">
            Motivos frecuentes
          </p>
          <div className="flex flex-wrap gap-2">
            {BAJA_PESO_SYMPTOMS.map(({ emoji, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-verde-borde)] bg-[#F7FBF0] px-3 py-1.5 text-xs font-medium text-[#27500A]"
              >
                <span>{emoji}</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-[var(--color-texto-3)]">Buscando médicos disponibles…</p>}

        {!loading && doctors.length === 0 && !error ? (
          <p className="rounded-xl border border-dashed border-[var(--color-verde-borde)] bg-[#F7FBF0] p-6 text-center text-sm text-[var(--color-texto-3)]">
            No hay médicos con agenda disponible por ahora. Intenta más tarde.
          </p>
        ) : !loading ? (
          <DoctorList doctors={doctors} notesPrefix="[Programa Baja de Peso]" />
        ) : null}

        <p className="rounded-xl border border-[var(--color-verde-borde)] bg-[#F7FBF0] px-4 py-3 text-sm text-[#27500A]">
          Podrás pagar con Bono Isapre o en línea según disponibilidad del médico. La solicitud queda pendiente hasta
          que el profesional confirme.
        </p>
      </div>
    </div>
  );
}
