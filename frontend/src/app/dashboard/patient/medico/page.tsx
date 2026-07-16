'use client';

import { useState } from 'react';
import UrgentRequestModal from '@/components/medico/UrgentRequestModal';
import {
  FloatingAction,
  MetricsStrip,
  MockMap,
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

const symptoms = [
  'Fiebre',
  'Resfrío / gripe',
  'Respiratorio',
  'Náuseas',
  'Dolor cabeza',
  'Pediatría',
  'Adulto mayor',
  'Otro',
] as const;

const benefits = [
  ['Llegamos a tu domicilio', 'clock'],
  ['Atención profesional', 'shield'],
  ['Receta médica', 'file'],
  ['Pago seguro', 'card'],
] as const;

export default function MedicoPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('Fiebre');
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    setLocating(true);
    window.setTimeout(() => setLocating(false), 850);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[16px] bg-[var(--color-azul-claro)] p-8 lg:grid-cols-[1.6fr_0.7fr]">
        <div>
          <Pill>
            <StatusDot />
            8 médicos disponibles cerca de ti ahora
          </Pill>
          <h1 className="mt-5 max-w-xl text-[38px] font-semibold leading-tight text-[var(--color-azul-oscuro)]">
            Médico a domicilio
            <br />
            <span className="text-[var(--color-rojo-urgencia)]">en 15–20 minutos aprox.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-texto-2)]">
            Solicita atención disponible cerca de tu zona. Sin agenda, sin elección manual: nuestro sistema asigna el
            primer médico disponible.
          </p>
          <div className="mt-5 rounded-[10px] border border-[var(--color-azul-borde)] bg-white p-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
                <SvgIcon name="shuffle" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-texto-1)]">
                  El primer médico disponible acepta tu solicitud
                </p>
                <p className="mt-1 text-xs text-[var(--color-texto-3)]">
                  No eliges al prestador: el sistema asigna automáticamente al profesional más cercano.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 w-[190px] rounded-[10px] border border-[var(--color-azul-borde)] bg-white p-4">
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
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-rojo-urgencia)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C93939]"
          >
            <SvgIcon name="ambulance" className="h-4 w-4" />
            Solicitar médico ahora
          </button>
          <p className="mt-3 text-xs text-[var(--color-texto-3)]">
            Un médico aceptará tu solicitud en menos de 2 minutos.
          </p>
        </div>

        <SectionCard className="h-fit p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-texto-2)]">
            <StatusDot />
            Disponibles ahora
          </div>
          <p className="mt-3 text-[34px] font-semibold text-[var(--color-rojo-urgencia)]">8</p>
          <p className="text-sm text-[var(--color-texto-3)]">médicos cerca de tu zona</p>
          <div className="mt-5 rounded-[10px] bg-[var(--color-azul-claro)] p-4">
            <p className="text-xs text-[var(--color-texto-3)]">Tiempo estimado</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xl font-semibold text-[var(--color-azul-primario)]">18 min</span>
              <span className="rounded-full bg-[var(--color-verde-claro)] px-3 py-1 text-xs font-medium text-[#27500A]">
                Disponible
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--color-texto-3)]">Última atención: hace 3 minutos</p>
        </SectionCard>
      </section>

      <SectionCard className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-texto-1)]">¿Cómo funciona la urgencia?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {['Solicitas', 'Asignación automática', 'Sigues en tiempo real', 'Atención en tu hogar'].map((step, index) => (
            <div key={step} className="relative text-center">
              <span
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white ${
                  index === 0 ? 'bg-[var(--color-rojo-urgencia)]' : 'bg-[var(--color-azul-primario)]'
                }`}
              >
                <SvgIcon
                  name={index === 0 ? 'briefcase' : index === 1 ? 'shuffle' : index === 2 ? 'activity' : 'home'}
                  className="h-5 w-5"
                />
              </span>
              <span className="absolute right-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-azul-primario)] text-[10px] font-medium text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--color-texto-1)]">{step}</p>
              <p className="mx-auto mt-1 max-w-[160px] text-xs text-[var(--color-texto-3)]">
                Proceso simple y monitoreado por la plataforma.
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <MetricsStrip items={urgentStats} />

      <SectionCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-texto-1)]">Médicos disponibles cerca de ti</h2>
          <span className="flex items-center gap-2 text-xs text-[var(--color-texto-3)]">
            <StatusDot />
            En vivo
          </span>
        </div>
        <MockMap height={160} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-texto-2)]">
            Médico más cercano:{' '}
            <span className="font-semibold text-[var(--color-rojo-urgencia)]">12 minutos</span>
          </p>
          <button
            type="button"
            onClick={detectLocation}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-azul-borde)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-azul-primario)] hover:bg-[var(--color-azul-claro)]"
          >
            <SvgIcon name="crosshair" className="h-4 w-4" />
            {locating ? 'Detectando...' : 'Detectar mi ubicación'}
          </button>
        </div>
      </SectionCard>

      <SectionCard className="p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">Solicitud simple</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Solo 3 pasos — menos de 60 segundos</h2>
        <div className="mt-5 grid grid-cols-3 items-center gap-2 text-center text-xs text-[var(--color-texto-3)]">
          <span className="rounded-full bg-[var(--color-verde-claro)] py-2 text-[#27500A]">Síntoma</span>
          <span className="rounded-full bg-[var(--color-rojo-claro)] py-2 text-[var(--color-rojo-urgencia)]">Ubicación</span>
          <span className="rounded-full bg-[#F3F4F6] py-2">Tus datos</span>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-[14px] border border-[var(--color-borde-card)] bg-white p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-texto-1)]">
              <SvgIcon name="check" className="h-4 w-4 text-[var(--color-verde)]" />
              Paso 1 — ¿Cuál es tu síntoma principal?
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              {symptoms.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => setSelectedSymptom(symptom)}
                  className={`rounded-[10px] border p-3 text-sm font-medium ${
                    selectedSymptom === symptom
                      ? 'border-[var(--color-rojo-borde)] bg-[var(--color-rojo-claro)] text-[var(--color-rojo-urgencia)]'
                      : 'border-[var(--color-borde-card)] bg-white text-[var(--color-texto-2)] hover:border-[var(--color-rojo-borde)]'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--color-rojo-borde)] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-texto-1)]">Paso 2 — Confirma tu ubicación</p>
            <button
              type="button"
              onClick={detectLocation}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] px-4 py-2 text-sm font-medium text-[var(--color-azul-primario)]"
            >
              <SvgIcon name="crosshair" className="h-4 w-4" />
              {locating ? 'Detectando ubicación...' : 'Detectar mi ubicación automáticamente'}
            </button>
            <input
              className="h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 text-sm outline-none focus:border-[var(--color-azul-borde)]"
              placeholder="O escribe tu dirección"
            />
          </div>

          <div className="rounded-[14px] border border-[var(--color-borde-card)] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-texto-1)]">Paso 3 — Solo 3 datos</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="h-10 rounded-[8px] border border-[var(--color-borde-card)] px-3 text-sm outline-none focus:border-[var(--color-azul-borde)]"
                placeholder="Tu nombre"
              />
              <input
                className="h-10 rounded-[8px] border border-[var(--color-borde-card)] px-3 text-sm outline-none focus:border-[var(--color-azul-borde)]"
                placeholder="Edad"
              />
            </div>
            <input
              className="mt-3 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 text-sm outline-none focus:border-[var(--color-azul-borde)]"
              placeholder="Teléfono de contacto"
            />
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-rojo-urgencia)] text-sm font-semibold text-white hover:bg-[#C93939]"
            >
              <SvgIcon name="shield" className="h-4 w-4" />
              Confirmar solicitud urgente
            </button>
          </div>
        </div>
      </SectionCard>

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

      <UrgentRequestModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <FloatingAction href="/dashboard/patient/medico">Solicitar médico ahora</FloatingAction>
    </div>
  );
}
