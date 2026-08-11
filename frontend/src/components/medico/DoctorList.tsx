'use client';

import { useState } from 'react';
import ScheduleModal, { type ScheduleLocationContext } from './ScheduleModal';
import { formatAgendaHomeVisitFeeClp, isValidAgendaBaseFee } from '@/lib/agendaPricing';

export interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
  availabilityLabel?: string;
  /** Tarifa base domicilio (CLP), desde `doctor_profiles.baseFee`. */
  baseFee?: number | null;
  region?: string | null;
  province?: string | null;
  /** @deprecated alias API legacy */
  city?: string | null;
  commune?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  acceptsWebpay?: boolean;
  acceptsIsapreBono?: boolean;
}

function formatHomeVisitFeeClp(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return 'Por confirmar';
  }
  return `$${amount.toLocaleString('es-CL')}`;
}

interface DoctorListProps {
  doctors: DoctorCard[];
  /** Agenda Médico a Domicilio: precio obligatorio; sin precio no se puede agendar. */
  requireAgendaPricing?: boolean;
  filterAvailable?: boolean;
  /** @deprecated Ubicación se deriva del mapa en ScheduleModal */
  location?: ScheduleLocationContext;
  onLocationRegion?: (v: string) => void;
  onLocationProvince?: (v: string) => void;
  onLocationCommune?: (v: string) => void;
}

export default function DoctorList({
  doctors,
  requireAgendaPricing = false,
  filterAvailable,
}: DoctorListProps) {
  const [modalDoctor, setModalDoctor] = useState<DoctorCard | null>(null);

  const filtered = filterAvailable
    ? doctors.filter((d) => (d.availabilityLabel || '').toLowerCase().includes('disponible'))
    : doctors;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
        {filtered.map((doctor) => {
          const hasAgendaPrice = isValidAgendaBaseFee(doctor.baseFee);
          const canScheduleAgenda = !requireAgendaPricing || hasAgendaPrice;

          return (
          <article
            key={doctor.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-sky-100 to-teal-100">
                {doctor.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doctor.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl">👨‍⚕️</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-gray-900">{doctor.name}</h3>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-700">
                  <span className="font-medium">★ {doctor.ratingAverage?.toFixed(1) ?? '—'}</span>
                  {doctor.ratingCount != null && (
                    <span className="text-gray-400">({doctor.ratingCount} opiniones)</span>
                  )}
                </div>
                {doctor.region && (
                  <p className="mt-1 text-xs text-gray-500">
                    📍 {doctor.commune || '—'},{' '}
                    {doctor.province || doctor.city || '—'}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-50 px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {doctor.acceptsWebpay !== false && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Webpay disponible
                  </span>
                )}
                {doctor.acceptsIsapreBono !== false && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Bono Isapre disponible
                  </span>
                )}
              </div>
              {requireAgendaPricing ? (
                hasAgendaPrice ? (
                  <p className="mt-2 text-xs text-gray-600">
                    Valor consulta a domicilio:{' '}
                    <span className="font-semibold text-gray-900">
                      {formatAgendaHomeVisitFeeClp(doctor.baseFee)}
                    </span>
                  </p>
                ) : (
                  <p
                    className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800"
                    role="alert"
                  >
                    Precio no configurado
                  </p>
                )
              ) : (
                <p className="mt-2 text-xs text-gray-600">
                  Valor consulta a domicilio:{' '}
                  <span className="font-semibold text-gray-900">{formatHomeVisitFeeClp(doctor.baseFee)}</span>
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-50 p-4">
              <p className="text-xs text-gray-500">
                {doctor.availabilityLabel || 'Horarios al elegir fecha'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ver perfil
                </button>
                <button
                  type="button"
                  disabled={!canScheduleAgenda}
                  title={
                    canScheduleAgenda
                      ? 'Ver horarios disponibles'
                      : 'El profesional debe configurar el valor de la consulta antes de agendar'
                  }
                  onClick={() => {
                    if (!canScheduleAgenda) return;
                    setModalDoctor(doctor);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    canScheduleAgenda
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  Ver horarios
                </button>
              </div>
            </div>
          </article>
        );
        })}
      </div>

      <ScheduleModal
        isOpen={!!modalDoctor}
        onClose={() => setModalDoctor(null)}
        doctor={modalDoctor}
      />
    </>
  );
}
