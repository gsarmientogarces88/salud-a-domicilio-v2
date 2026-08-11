'use client';

/** Valor fijo de urgencia (alineado con commission_settings.urgentFixedFee en seed). Solo UI. */
const URGENT_SERVICE_PRICE_CLP = 50_000;

function formatClp(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

function IconUrgentService({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="8" y="12" width="48" height="48" rx="12" fill="#ECFDF5" />
      <circle cx="32" cy="32" r="18" stroke="#059669" strokeWidth="2.5" fill="#fff" />
      <path d="M32 22v12l8 5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="44" cy="44" r="8" fill="#10B981" />
      <path d="M41 44l2 2 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconDoctor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20v-1a5 5 0 0110 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M16 8h4M18 6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M11 1L4 11h5l-1 8 7-11H10l1-7z" />
    </svg>
  );
}

function IconDollar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v10M9 9.5c0-1 1.2-1.5 3-1.5s3 .5 3 1.5-1.2 1.5-3 1.5-3 .5-3 1.5 1.2 1.5 3 1.5 3-.5 3-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface UrgentHomeCareCardProps {
  onRequestUrgent: () => void;
}

export default function UrgentHomeCareCard({ onRequestUrgent }: UrgentHomeCareCardProps) {
  const benefits = [
    {
      icon: IconClock,
      title: 'Atención en',
      highlight: '15 - 20 minutos aprox.',
    },
    {
      icon: IconDoctor,
      title: 'Médicos certificados',
      highlight: 'con amplia experiencia',
    },
    {
      icon: IconShield,
      title: 'Seguridad y confianza',
      highlight: 'para ti y tu familia',
    },
  ] as const;

  const footerItems = [
    {
      icon: IconDollar,
      title: 'Valor del servicio',
      highlight: formatClp(URGENT_SERVICE_PRICE_CLP),
      highlightClass: 'text-emerald-600',
    },
    {
      icon: IconLock,
      title: 'Pago seguro',
      highlight: 'Webpay disponible',
      highlightClass: 'text-gray-800',
    },
    {
      icon: IconCheckCircle,
      title: 'Atención inmediata',
      highlight: 'Cuidado cuando más lo necesitas',
      highlightClass: 'text-gray-800',
    },
  ] as const;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg ring-1 ring-gray-100/80">
      <div className="p-5 sm:p-6 lg:p-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <IconUrgentService className="h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]" />
          <div className="min-w-0 flex-1">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100 sm:text-xs">
              <IconBolt className="h-3.5 w-3.5" />
              Servicio rápido
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Urgencia a Domicilio
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
              Atención médica rápida y confiable sin salir de tu hogar.
            </p>
          </div>
        </div>

        {/* Beneficios */}
        <div className="mt-8 grid grid-cols-1 divide-y divide-gray-100 sm:mt-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="flex flex-col items-center px-2 py-5 text-center first:pt-0 last:pb-0 sm:py-2 sm:first:pl-0 sm:last:pr-0"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <b.icon className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold text-gray-900">{b.title}</p>
              <p className="mt-0.5 text-sm font-medium text-emerald-600">{b.highlight}</p>
            </div>
          ))}
        </div>

        {/* CTA — misma acción que antes: abrir modal urgente */}
        <button
          type="button"
          onClick={onRequestUrgent}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 sm:mt-10"
        >
          <IconBolt className="h-5 w-5 shrink-0" />
          Pedir urgencia a domicilio
        </button>
      </div>

      {/* Franja inferior */}
      <div className="border-t border-gray-100 bg-gray-50/90 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
          {footerItems.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center lg:flex-row lg:items-start lg:text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <item.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">{item.title}</p>
                <p className={`mt-0.5 text-sm font-bold ${item.highlightClass}`}>{item.highlight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
