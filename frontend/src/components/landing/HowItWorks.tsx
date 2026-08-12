const STEPS = [
  {
    title: 'Selecciona',
    description: 'Elige urgencia, agenda, exámenes o el programa que necesitas.',
    icon: 'pulse' as const,
  },
  {
    title: 'Confirma',
    description: 'Indica tu ubicación y confirma los detalles de la atención.',
    icon: 'pin' as const,
  },
  {
    title: 'Paga',
    description: 'Paga de forma segura con Webpay, bono o efectivo.',
    icon: 'card' as const,
  },
  {
    title: 'Recibe',
    description: 'Un profesional certificado llega a tu domicilio en minutos.',
    icon: 'home' as const,
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 bg-[#F8FAFB] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          ¿Cómo funciona?
        </p>
        <h2 className="mb-12 text-center text-[28px] font-bold tracking-tight text-[#0B3A6E] sm:text-[32px]">
          Atención en 4 pasos simples
        </h2>

        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-px border-t-2 border-dashed border-[#B5D4F4] lg:block" />
          {STEPS.map((step, index) => (
            <div key={step.title} className="relative text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-sm ${
                  index === 0
                    ? 'border-[#185FA5] bg-[#185FA5] text-white'
                    : 'border-[#B5D4F4] bg-white text-[#185FA5]'
                }`}
              >
                <StepIcon name={step.icon} />
              </div>
              <h3 className="mb-2 text-[16px] font-semibold text-[#111827]">{step.title}</h3>
              <p className="mx-auto max-w-[220px] text-[13px] leading-relaxed text-[#6B7280]">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepIcon({ name }: { name: 'pulse' | 'pin' | 'home' | 'card' }) {
  const cls = 'h-6 w-6';
  if (name === 'pulse') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'pin') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === 'home') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
