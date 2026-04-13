'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import DoctorList, { DoctorCard } from '@/components/medico/DoctorList';
import LocationSelector from '@/components/ui/LocationSelector';
import SpecialtySidebar from '@/components/agendar/SpecialtySidebar';
import { MEDICAL_SPECIALTIES } from '@/data/medicalSpecialties';

export default function AgendarPage() {
  const { user } = useAuth();
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [specialty, setSpecialty] = useState<string>(MEDICAL_SPECIALTIES[0]);
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
      params.set('type', specialty || 'Medicina');
      params.set('region', region);
      params.set('province', province);
      params.set('city', province);
      params.set('commune', commune);

      const res = await apiFetch<{ data: any[] }>(`/professionals?${params.toString()}`);
      const items: DoctorCard[] = res.data.map((p) => ({
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Agenda Médico a Domicilio</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            👤
          </span>
        </div>
      </div>

      <div className="mb-6 w-full rounded-xl border border-sky-100 bg-sky-50/80 px-5 py-5 text-sm leading-relaxed text-gray-700">
        <p className="mb-2 font-semibold text-gray-900">Profesionales disponibles</p>
        <p className="mb-3">
          En nuestra plataforma podrás encontrar médicos generales, médicos especialistas y profesionales con
          formación complementaria (magíster, diplomados o amplia experiencia clínica en áreas específicas).
        </p>
        <p>
          Toda la información sobre la formación, experiencia y trayectoria profesional de cada médico se encuentra
          disponible en su perfil, para que puedas elegir con confianza según tus necesidades.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <SpecialtySidebar active={specialty} onSelect={setSpecialty} />

        <div className="min-w-0 flex-1 space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-gray-900">{specialty}</h2>
            <p className="mb-4 text-xs text-gray-500">Ubicación del paciente y búsqueda</p>

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
