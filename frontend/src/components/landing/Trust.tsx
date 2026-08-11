const TRUST_ITEMS = [
  {
    title: 'Profesionales certificados',
    description: 'Médicos y especialistas verificados, con registro activo.',
    tone: 'blue' as const,
  },
  {
    title: 'Identidad verificada',
    description: 'Validamos identidad de pacientes y profesionales en la plataforma.',
    tone: 'green' as const,
  },
  {
    title: 'Pago seguro Webpay',
    description: 'Transacciones encriptadas con los estándares de la industria.',
    tone: 'blue' as const,
  },
  {
    title: 'Receta médica digital',
    description: 'Documentación clínica digital al finalizar tu atención.',
    tone: 'teal' as const,
  },
  {
    title: 'Datos protegidos',
    description: 'Tu información de salud se trata con confidencialidad y seguridad.',
    tone: 'green' as const,
  },
  {
    title: 'Soporte 24/7',
    description: 'Acompañamiento humano cuando lo necesitas, día y noche.',
    tone: 'orange' as const,
  },
];

const TONE = {
  blue: 'bg-[#E6F1FB] text-[#185FA5]',
  green: 'bg-[#EAF3DE] text-[#1D9E75]',
  teal: 'bg-[#E6F7F3] text-[#0D9488]',
  orange: 'bg-[#FEF3C7] text-[#B45309]',
} as const;

export default function Trust() {
  return (
    <section id="especialidades" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Seguridad y confianza
        </p>
        <h2 className="mb-10 text-center text-[28px] font-bold tracking-tight text-[#0B3A6E] sm:text-[32px]">
          Tu salud, en manos confiables
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFB] p-5 transition hover:border-[#B5D4F4] hover:bg-white hover:shadow-sm"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${TONE[item.tone]}`}>
                <ShieldMini />
              </div>
              <h3 className="mb-1.5 text-[15px] font-semibold text-[#111827]">{item.title}</h3>
              <p className="text-[13px] leading-relaxed text-[#6B7280]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShieldMini() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v5c0 4.5 3 8.2 7 9.5 4-1.3 7-5 7-9.5V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
