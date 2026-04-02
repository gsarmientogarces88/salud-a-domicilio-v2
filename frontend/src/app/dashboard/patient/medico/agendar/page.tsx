'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import DoctorList, { DoctorCard } from '@/components/medico/DoctorList';
import LocationSelector from '@/components/ui/LocationSelector';

export default function AgendarPage() {
  const { user } = useAuth();
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDoctors = async () => {
    if (!region || !city || !commune) {
      setError('Selecciona región, ciudad y comuna para buscar médicos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('type', specialty || 'Medicina');
      params.set('region', region);
      params.set('city', city);
      params.set('commune', commune);

      const res = await apiFetch<{ data: any[] }>(`/professionals?${params.toString()}`);
      const items: DoctorCard[] = res.data.map((p) => ({
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        specialty: p.specialty,
        region: p.region,
        city: p.city,
        commune: p.commune,
        availabilityLabel: 'Agenda disponible',
      }));
      setDoctors(items);
    } catch (e: any) {
      setError(e.message || 'Error al cargar médicos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">👤</span>
            Elegir Médico y Hora
          </h1>
          <p className="text-gray-600">
            Selecciona al médico de tu preferencia y programa una hora de visita a domicilio.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 hover:bg-gray-100">
            <span className="text-xl">🔔</span>
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              1
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-sky-200 text-center leading-10 text-sky-700">
              👤
            </span>
          </div>
        </div>
      </div>

      {/* Filtros de ubicación del paciente */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <LocationSelector
            region={region}
            city={city}
            commune={commune}
            onRegionChange={setRegion}
            onCityChange={setCity}
            onCommuneChange={setCommune}
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-xs font-semibold text-gray-700">Especialidad</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option>Medicina General</option>
            <option>Pediatría</option>
            <option>Cardiología</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => setShowAvailableOnly(e.target.checked)}
            className="h-4 w-4 rounded text-green-500"
          />
          Mostrar solo médicos disponibles
        </label>
        <button
          type="button"
          onClick={loadDoctors}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Buscar médicos
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mb-3 text-sm text-gray-500">Buscando médicos cercanos...</p>}

      {/* Lista médicos */}
      {doctors.length === 0 && !loading ? (
        <p className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
          No se encontraron médicos para la ubicación seleccionada. Prueba con otra comuna o ciudad.
        </p>
      ) : (
        <DoctorList doctors={doctors} filterAvailable={showAvailableOnly} />
      )}

      {/* Barra inferior */}
      <div className="mt-8 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          Podrás pagar con Bono de Isapre o en línea tras confirmar disponibilidad del doctor.{' '}
          <a href="#" className="font-medium text-sky-600 hover:underline">
            Ve cómo funciona →
          </a>
        </p>
      </div>
    </div>
  );
}
