'use client';

import { useState } from 'react';

const DOCTORS = [
  { id: 'd1', label: '12 min', top: '22%', left: '28%' },
  { id: 'd2', label: '18 min', top: '48%', left: '68%' },
  { id: 'd3', label: '23 min', top: '62%', left: '38%' },
] as const;

/**
 * Illustrative map prepared for future geolocation integration.
 * Detectar ubicación uses browser geolocation when available.
 */
export default function NearbyDoctors() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ok');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section id="cobertura" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Disponibilidad en tiempo real
        </p>
        <h2 className="mb-8 text-center text-[28px] font-bold tracking-tight text-[#0B3A6E] sm:text-[32px]">
          Médicos disponibles cerca de ti
        </h2>

        <div className="overflow-hidden rounded-2xl border border-[#B5D4F4] bg-[#EAF3FB] shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#B5D4F4]/60 bg-white/70 px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-[#374151]">
              Tu zona: <span className="text-[#185FA5]">Gran Concepción</span>
            </p>
            {status === 'ok' && coords ? (
              <p className="text-xs text-[#1D9E75]">
                Ubicación detectada ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
              </p>
            ) : null}
            {status === 'denied' ? (
              <p className="text-xs text-[#E24B4A]">No pudimos acceder a tu ubicación</p>
            ) : null}
          </div>

          <div className="relative h-[280px] sm:h-[340px]">
            {/* Grid / map illustration */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(#B5D4F4 1px, transparent 1px), linear-gradient(90deg, #B5D4F4 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute inset-8 rounded-full border border-[#B5D4F4]/80" />
            <div className="absolute inset-16 rounded-full border border-[#B5D4F4]/50" />

            {/* User marker */}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#185FA5] text-white shadow-lg shadow-[#185FA5]/40 ring-4 ring-white">
                <UserIcon />
              </span>
            </div>

            {DOCTORS.map((doc) => (
              <div
                key={doc.id}
                className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                style={{ top: doc.top, left: doc.left }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#185FA5] shadow-sm ring-1 ring-[#E5EAF0]">
                    {doc.label}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#185FA5] shadow-md ring-2 ring-[#185FA5]/20">
                    <CrossIcon />
                  </span>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={detectLocation}
              disabled={status === 'loading'}
              className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#185FA5] shadow-md ring-1 ring-[#E5EAF0] transition hover:bg-[#F0F7FF] disabled:opacity-70"
            >
              <TargetIcon />
              {status === 'loading' ? 'Detectando…' : 'Detectar ubicación'}
            </button>
          </div>

          <div className="border-t border-[#B5D4F4]/60 bg-white/80 px-4 py-3 text-center text-sm text-[#4B5563] sm:px-5">
            Médico más cercano a ti: <strong className="text-[#185FA5]">12 minutos aprox.</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
