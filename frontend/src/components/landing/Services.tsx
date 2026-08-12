'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LANDING_ROUTES, SERVICE_PRICES, scrollToLoginSection } from '@/lib/landingConfig';

type ServiceCard = {
  id: string;
  title: string;
  description: string;
  price: string;
  pricePrefix?: string;
  badge?: string;
  cta: string;
  path: string;
  accent: 'red' | 'blue' | 'green' | 'teal';
};

const SERVICES: ServiceCard[] = [
  {
    id: 'urgencia',
    title: 'Urgencia',
    description: 'Médico a domicilio en 15–20 minutos. Atención inmediata donde estés.',
    price: SERVICE_PRICES.urgency,
    cta: 'Solicitar',
    path: LANDING_ROUTES.urgency,
    accent: 'red',
  },
  {
    id: 'agenda',
    title: 'Agenda Médica',
    description: 'Elige día, hora y profesional. Consulta programada a domicilio.',
    price: SERVICE_PRICES.scheduleFrom,
    pricePrefix: 'Desde',
    badge: 'Más solicitado',
    cta: 'Agendar',
    path: LANDING_ROUTES.schedule,
    accent: 'blue',
  },
  {
    id: 'examenes',
    title: 'Exámenes',
    description: 'Toma de muestras en tu domicilio. Resultados digitales seguros.',
    price: SERVICE_PRICES.examsFrom,
    pricePrefix: 'Desde',
    badge: 'Próximamente',
    cta: 'Solicitar',
    path: LANDING_ROUTES.exams,
    accent: 'green',
  },
  {
    id: 'baja-peso',
    title: 'Programa Baja de Peso',
    description: 'Plan integral con seguimiento médico, nutrición y hábitos.',
    price: SERVICE_PRICES.weightLossFrom,
    pricePrefix: 'Desde',
    badge: 'Próximamente',
    cta: 'Ver Programa',
    path: LANDING_ROUTES.weightLoss,
    accent: 'teal',
  },
];

const ACCENT = {
  red: {
    icon: 'bg-[#FCEBEB] text-[#E24B4A]',
    btn: 'bg-[#FCEBEB] text-[#C53030] hover:bg-[#F8D7D7]',
    badge: 'bg-[#FCEBEB] text-[#E24B4A]',
  },
  blue: {
    icon: 'bg-[#E6F1FB] text-[#185FA5]',
    btn: 'bg-[#E6F1FB] text-[#185FA5] hover:bg-[#D4E7F8]',
    badge: 'bg-[#E6F1FB] text-[#185FA5]',
  },
  green: {
    icon: 'bg-[#EAF3DE] text-[#1D9E75]',
    btn: 'bg-[#EAF3DE] text-[#1D9E75] hover:bg-[#DFECD0]',
    badge: 'bg-[#EAF3DE] text-[#1D9E75]',
  },
  teal: {
    icon: 'bg-[#E6F7F3] text-[#0D9488]',
    btn: 'bg-[#E6F7F3] text-[#0D9488] hover:bg-[#D5F0EA]',
    badge: 'bg-[#E6F7F3] text-[#0D9488]',
  },
} as const;

export default function Services() {
  const { user } = useAuth();

  const handleServiceClick = () => {
    scrollToLoginSection();
  };

  return (
    <section id="servicios" className="scroll-mt-24 bg-[#F8FAFB] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Nuestros servicios
        </p>
        <h2 className="mb-10 text-center text-[28px] font-bold tracking-tight text-[#0B3A6E] sm:text-[32px]">
          ¿Qué tipo de atención necesitas?
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => {
            const a = ACCENT[service.accent];
            return (
              <article
                key={service.id}
                className="relative flex h-full flex-col rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {service.badge ? (
                  <span className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.badge}`}>
                    {service.badge}
                  </span>
                ) : null}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${a.icon}`}>
                  <ServiceIcon id={service.id} />
                </div>
                <h3 className="mb-2 text-[17px] font-semibold text-[#111827]">{service.title}</h3>
                <p className="mb-4 flex-1 text-[13px] leading-relaxed text-[#6B7280]">{service.description}</p>
                <p className="mb-4 text-[15px] font-bold text-[#0B3A6E]">
                  {service.pricePrefix ? (
                    <span className="mr-1 text-[12px] font-medium text-[#6B7280]">{service.pricePrefix}</span>
                  ) : null}
                  {service.price}
                </p>
                {user ? (
                  <Link
                    href={service.path}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${a.btn}`}
                  >
                    {service.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleServiceClick}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${a.btn}`}
                  >
                    {service.cta}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ServiceIcon({ id }: { id: string }) {
  const common = 'h-5 w-5';
  if (id === 'urgencia') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (id === 'agenda') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5V7M16 3.5V7M3.5 10h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'examenes') {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 3h6v4H9V3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 7v3.5L7 18.5A2.5 2.5 0 0 0 9.3 22h5.4A2.5 2.5 0 0 0 17 18.5L14 10.5V7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
