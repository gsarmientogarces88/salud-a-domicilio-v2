'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoginCard from '@/components/landing/LoginCard';
import { LANDING_ROUTES, LOGIN_ANCHOR_ID, SERVICE_PRICES, scrollToLoginSection, whatsappUrl } from '@/lib/landingConfig';

const BADGES = ['Registro SIS activo', 'Atención 24/7', 'Médicos certificados', 'Chile'] as const;

export default function Hero() {
  const { user } = useAuth();

  return (
    <section className="bg-[#EAF3FB]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-16">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C8DFC0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1D9E75] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#1D9E75]" />
            3 médicos disponibles cerca de ti ahora
          </div>

          <h1 className="mb-4 text-[32px] font-bold leading-[1.15] tracking-tight text-[#0B3A6E] sm:text-[40px] lg:text-[44px]">
            Médicos a domicilio
            <br />
            en 15–20 minutos.
          </h1>

          <p className="mb-6 max-w-lg text-[15px] leading-relaxed text-[#4B5563] sm:text-[16px]">
            Atención médica profesional, verificada y segura donde estés.
            <br />
            Sin filas. Sin traslado.
          </p>

          <div className="mb-5 max-w-md rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-[#6B7280]">Urgencia a domicilio — precio fijo</p>
                <p className="mt-1 text-[28px] font-bold tracking-tight text-[#0B3A6E]">{SERVICE_PRICES.urgency}</p>
              </div>
              <span className="rounded-lg bg-[#EAF3FB] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#185FA5]">
                Fijo
              </span>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[#D1D5DB] bg-white/80 px-3 py-1 text-[11px] font-medium text-[#4B5563]"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {user ? (
              <Link
                href={LANDING_ROUTES.urgency}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#185FA5] px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#185FA5]/25 transition hover:bg-[#144E8A] sm:w-auto"
              >
                <PulseIcon />
                Solicitar atención ahora
              </Link>
            ) : (
              <button
                type="button"
                onClick={scrollToLoginSection}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#185FA5] px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#185FA5]/25 transition hover:bg-[#144E8A] sm:w-auto"
              >
                <PulseIcon />
                Solicitar atención ahora
              </button>
            )}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#185FA5] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#185FA5] transition hover:bg-[#F0F7FF] sm:w-auto"
            >
              <WhatsAppOutline />
              Consultar por WhatsApp
            </a>
          </div>
        </div>

        <div id={LOGIN_ANCHOR_ID} className="scroll-mt-28 lg:justify-self-end lg:w-full lg:max-w-[420px]">
          <LoginCard />
        </div>
      </div>
    </section>
  );
}

function PulseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppOutline() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.7 15l-1.1 4 4.1-1.1A10 10 0 1 0 12 2zm5.5 12.3c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.6.9-.8 1-.1.1-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.9-.1-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 2.6 1.1 2.6.7 3.1.7.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2z" />
    </svg>
  );
}
