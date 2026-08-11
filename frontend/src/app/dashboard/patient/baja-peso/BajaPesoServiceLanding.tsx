'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import DoctorList, { DoctorCard } from '@/components/medico/DoctorList';
import LocationSelector from '@/components/ui/LocationSelector';

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
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [search, setSearch] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDoctors = async () => {
    if (!region || !province || !commune) {
      setError('Selecciona región, provincia y comuna para buscar médicos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('type', BAJA_PESO_PROFESSIONAL_TYPE);
      params.set('region', region);
      params.set('province', province);
      params.set('city', province);
      params.set('commune', commune);

      const res = await apiFetch<{ data: any[] }>(`/professionals?${params.toString()}`);
      const items: DoctorCard[] = (res.data || []).map((p) => ({
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        specialty: p.specialty,
        region: p.region,
        province: p.province ?? p.city,
        city: p.city ?? p.province,
        commune: p.commune,
        availabilityLabel: 'Agenda disponible',
        baseFee: typeof p.baseFee === 'number' ? p.baseFee : null,
        ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 4.8,
        ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 24,
        acceptsWebpay: p.acceptsWebpay !== false,
        acceptsIsapreBono: p.acceptsIsapreBono !== false,
      }));
      setDoctors(items);
    } catch (e: any) {
      setError(e.message || 'Error al cargar médicos.');
    } finally {
      setLoading(false);
    }
  };

  const q = search.trim().toLowerCase();
  const visibleDoctors = q
    ? doctors.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
    : doctors;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #7dd3fc 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, #bae6fd 0%, transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-5xl">
            👨‍⚕️
          </div>
        </div>

        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Consulta a Domicilio con Médico Especialista en Control de Peso
        </h2>
        <div className="mb-6 space-y-4 text-center text-gray-600">
          <p>
            Un médico con experiencia en control de peso te atenderá en tu hogar para evaluar tu estado de salud,
            identificar las causas del aumento de peso y definir un tratamiento personalizado que permita una reducción
            efectiva y sostenida en el corto y mediano plazo.
          </p>
          <p>
            En algunos casos, y bajo supervisión médica, los tratamientos pueden lograr reducciones de peso
            significativas, pudiendo alcanzar hasta un 20% del peso corporal en determinados pacientes.
          </p>
        </div>

        <section className="mb-8">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Síntomas que atendemos</h3>
          <p className="mb-4 text-gray-600">
            Nuestros médicos pueden orientarte en tu domicilio ante estos y otros motivos relacionados con el control de
            peso y la salud metabólica.
          </p>
          <div className="flex flex-wrap gap-3">
            {BAJA_PESO_SYMPTOMS.map(({ emoji, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800"
              >
                <span className="text-base">{emoji}</span>
                {label}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-2 space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-lg font-bold text-gray-900">
              Encuentra un médico especialista en control de peso
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Selecciona tu ubicación para ver médicos disponibles en tu zona.
            </p>

            <div className="mb-4">
              <LocationSelector
                region={region}
                province={province}
                commune={commune}
                onRegionChange={setRegion}
                onProvinceChange={setProvince}
                onCommuneChange={setCommune}
              />
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-semibold text-gray-700">Buscar médicos</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o palabra clave"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600"
                />
                Solo disponibles
              </label>
              <button
                type="button"
                onClick={loadDoctors}
                className="shrink-0 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Buscar
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading && <p className="text-sm text-gray-500">Buscando médicos...</p>}
          </div>

          {!loading && visibleDoctors.length === 0 && doctors.length === 0 && !error ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-sm text-gray-500">
              Configura ubicación y pulsa Buscar para ver profesionales.
            </p>
          ) : !loading && visibleDoctors.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
              No hay resultados para tu búsqueda. Prueba otro término o especialidad.
            </p>
          ) : (
            <DoctorList
              doctors={visibleDoctors}
              filterAvailable={showAvailableOnly}
              location={{ region, province, commune }}
              onLocationRegion={setRegion}
              onLocationProvince={setProvince}
              onLocationCommune={setCommune}
            />
          )}

          <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-gray-700">
            Podrás pagar con Bono Isapre o en línea según disponibilidad del médico. La solicitud queda en estado
            pendiente hasta que el profesional confirme.
          </div>
        </div>
      </div>
    </div>
  );
}
