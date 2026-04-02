'use client';

import { useState } from 'react';
import ScheduleModal from './ScheduleModal';

export interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
  availabilityLabel?: string;
  region?: string | null;
  city?: string | null;
  commune?: string | null;
}

interface DoctorListProps {
  doctors: DoctorCard[];
  filterAvailable?: boolean;
}

export default function DoctorList({ doctors, filterAvailable }: DoctorListProps) {
  const [modalDoctor, setModalDoctor] = useState<DoctorCard | null>(null);

  const filtered = filterAvailable
    ? doctors.filter((d) => (d.availabilityLabel || '').toLowerCase().includes('hoy'))
    : doctors;

  return (
    <>
      <div className="space-y-4">
        {filtered.map((doctor) => (
          <div
            key={doctor.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-2xl">
                👨‍⚕️
              </span>
              <div>
                <p className="font-bold text-gray-900">{doctor.name}</p>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
                {doctor.region && (
                  <p className="text-xs text-gray-500">
                    📍 {doctor.commune || 'Sin comuna'}, {doctor.city || 'Sin ciudad'},{' '}
                    {doctor.region}
                  </p>
                )}
                {doctor.availabilityLabel && (
                  <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {doctor.availabilityLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50">
                Ver perfil
              </button>
              <button
                onClick={() => setModalDoctor(doctor)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Seleccionar
              </button>
            </div>
          </div>
        ))}
      </div>

      <ScheduleModal
        isOpen={!!modalDoctor}
        onClose={() => setModalDoctor(null)}
        doctor={modalDoctor}
      />
    </>
  );
}
