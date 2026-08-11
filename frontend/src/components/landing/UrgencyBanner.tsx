'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LANDING_ROUTES } from '@/lib/landingConfig';

export default function UrgencyBanner() {
  const { user } = useAuth();
  const href = user ? LANDING_ROUTES.urgency : `${LANDING_ROUTES.login}?redirect=${encodeURIComponent(LANDING_ROUTES.urgency)}`;

  return (
    <section className="bg-[#E24B4A] text-white" aria-label="Atención urgente">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:mt-0">
            <SirenIcon />
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-snug sm:text-[16px]">
              ¿Necesitas atención médica urgente ahora?
            </p>
            <p className="mt-0.5 text-[12px] text-white/90 sm:text-[13px]">
              Médico disponible en 15–20 min aprox. • Disponible las 24 horas • Sin necesidad de registrarse
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-[#E24B4A] shadow-sm transition hover:bg-red-50 sm:w-auto"
        >
          Solicitar médico urgente
        </Link>
      </div>
    </section>
  );
}

function SirenIcon() {
  return (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c-3.3 0-6 2.7-6 6v3.2L4.4 15A1 1 0 0 0 5.3 16.5h13.4a1 1 0 0 0 .9-1.5L18 12.2V9c0-3.3-2.7-6-6-6Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path d="M9 18.5a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 2v1.2M5.2 5.2l.9.9M18.8 5.2l-.9.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
