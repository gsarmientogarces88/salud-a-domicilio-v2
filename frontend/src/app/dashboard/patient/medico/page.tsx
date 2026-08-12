'use client';

import SimpleUrgentRequestForm from '@/components/medico/SimpleUrgentRequestForm';
import {
  FloatingAction,
  MetricsStrip,
  Pill,
  RatingStars,
  SectionCard,
  StatusDot,
  SvgIcon,
} from '@/components/medicilio/MedicilioUI';

const urgentStats = [
  { value: '+3.000', label: 'Atenciones realizadas' },
  { value: '4.9/5', label: 'Valoración promedio' },
  { value: '100%', label: 'Profesionales verificados' },
  { value: '<2 min', label: 'Tiempo de asignación' },
];

const benefits = [
  ['Llegamos a tu domicilio', 'clock'],
  ['Atención profesional', 'shield'],
  ['Receta médica', 'file'],
  ['Pago seguro', 'card'],
] as const;

export default function MedicoPage() {
  return (
    <div className="space-y-6 md:mr-auto md:w-full md:max-w-7xl md:pl-6 lg:pl-8">
      <section className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <div className="order-2 md:order-1">
          <SimpleUrgentRequestForm />
        </div>

        <div className="order-1 space-y-4 md:order-2">
          <SectionCard className="p-5">
            <Pill>
              <StatusDot />
              Médicos disponibles cerca de ti
            </Pill>
            <h1 className="mt-4 text-[28px] font-semibold leading-tight text-[var(--color-azul-oscuro)] sm:text-[32px]">
              Médico a domicilio en{' '}
              <span className="text-[var(--color-rojo-urgencia)]">15–20 minutos aprox.</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-texto-2)]">
              Sin agenda y sin elegir médico: el sistema asigna al profesional disponible más cercano.
            </p>
            <div className="mt-4 rounded-[10px] border border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] p-4">
              <p className="text-xs font-medium text-[var(--color-texto-3)]">Precio fijo</p>
              <p className="mt-1 text-[22px] font-semibold text-[var(--color-azul-oscuro)]">$50.000</p>
              <p className="mt-1 text-xs text-[var(--color-texto-3)]">Webpay · Isapre · Efectivo</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Registro SIS', 'Webpay', '24/7', 'Médicos certificados'].map((pill) => (
                <Pill key={pill} tone="gray">
                  {pill}
                </Pill>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <h2 className="text-base font-semibold text-[var(--color-texto-1)]">¿Cómo funciona?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {['Solicitas', 'Asignación automática', 'Seguimiento en vivo', 'Atención en casa'].map(
                (step, index) => (
                  <div key={step} className="rounded-[10px] border border-[var(--color-borde-card)] p-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-azul-primario)] text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-texto-1)]">{step}</p>
                  </div>
                ),
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <p className="rounded-[12px] border border-[var(--color-rojo-borde)] bg-[var(--color-rojo-claro)] px-4 py-3 text-center text-sm leading-5 text-[var(--color-rojo-urgencia)]">
        Medicilio no reemplaza servicios de emergencia: ante una emergencia grave debes llamar al{' '}
        <a href="tel:131" className="font-semibold underline underline-offset-2">
          131
        </a>
        .
      </p>

      <MetricsStrip items={urgentStats} />

      <div className="grid gap-3 md:grid-cols-4">
        {benefits.map(([label, icon]) => (
          <SectionCard key={label} className="p-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
              <SvgIcon name={icon} className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[var(--color-texto-1)]">{label}</p>
          </SectionCard>
        ))}
      </div>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Testimonios verificados
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">
          Lo que dicen quienes ya usaron Medicilio
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            'El médico llegó en 17 minutos. Me hizo sentir segura durante todo el proceso.',
            'Todo fue muy claro, desde la solicitud hasta el pago.',
            'Excelente atención para una urgencia familiar.',
          ].map((text, index) => (
            <SectionCard key={text} className="p-5">
              <p className="text-sm leading-6 text-[var(--color-texto-2)]">{text}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-texto-3)]">
                  {['María B.', 'Roberto C.', 'Claudia P.'][index]}
                </span>
                <RatingStars />
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <FloatingAction href="#solicitud-simple">Solicitar médico ahora</FloatingAction>
    </div>
  );
}
