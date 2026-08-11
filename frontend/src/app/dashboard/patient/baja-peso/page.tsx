'use client';

import { useMemo, useState } from 'react';
import {
  InitialAvatar,
  Pill,
  RatingStars,
  SectionCard,
  SvgIcon,
} from '@/components/medicilio/MedicilioUI';
import { useBajaPesoAgendar } from '@/components/baja-peso/BajaPesoAgendarContext';
import ProyeccionPeso from './ProyeccionPeso';

type AvatarTone = NonNullable<Parameters<typeof InitialAvatar>[0]['tone']>;

const stats = [
  ['-12 kg', 'Reducción promedio'],
  ['92%', 'Adherencia'],
  ['4.9', 'Valoraciones'],
  ['6 meses', 'Promedio'],
] as const;

const team = [
  ['Dr. Carlos Muñoz', 'CM', 'Médico especialista obesidad', '12 años de experiencia', 'blue'],
  ['Nut. Ana Pérez', 'AP', 'Nutricionista clínica', '8 años de experiencia', 'green'],
  ['Kin. Felipe Lagos', 'FL', 'Kinesiólogo deportivo', '7 años de experiencia', 'purple'],
  ['Psic. María Torres', 'MT', 'Psicóloga conductual', '10 años de experiencia', 'amber'],
] as const;

const plan = {
  badge: 'Plan telemedicina',
  price: '$75.000',
  term: 'Incluye 1 atención médica y atención con nutricionista',
  features: [
    'Evaluación médica por telemedicina',
    'Plan nutricional personalizado',
    'Seguimiento y controles incluidos',
    'Mensajes con el equipo clínico',
  ],
} as const;

const benefits = [
  ['Salud cardiovascular', 'Control preventivo del corazón'],
  ['Mejor sueño', 'Rutinas y hábitos sostenibles'],
  ['Más energía', 'Actividad guiada y segura'],
  ['Menor riesgo diabetes', 'Manejo metabólico profesional'],
  ['Bienestar emocional', 'Apoyo psicológico continuo'],
  ['Resultados duraderos', 'Mantención luego del programa'],
] as const;

export default function BajaPesoPage() {
  const { openAgendar } = useBajaPesoAgendar();
  const [weight, setWeight] = useState(95);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(38);
  const [sex, setSex] = useState('Femenino');
  const [goal, setGoal] = useState(78);

  const result = useMemo(() => {
    const meters = Math.max(height, 1) / 100;
    const bmi = weight / (meters * meters);
    const ideal = 22 * (meters * meters);
    const toLose = Math.max(0, weight - ideal);
    const months = Math.max(1, Math.ceil(toLose / 1.5));
    const category =
      bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad';
    const color =
      bmi < 18.5 ? '#185FA5' : bmi < 25 ? '#1D9E75' : bmi < 30 ? '#BA7517' : '#E24B4A';
    const progress = Math.min(100, Math.max(7, ((bmi - 15) / 25) * 100));
    return { bmi, ideal, toLose, months, category, color, progress };
  }, [weight, height]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[16px] border border-[var(--color-verde-borde)] bg-[var(--color-verde-claro)] p-8 lg:grid-cols-[1.55fr_0.75fr]">
        <div>
          <Pill tone="green">Programa médico certificado</Pill>
          <h1 className="mt-5 text-[38px] font-semibold leading-tight text-[#173404]">
            Programa médico
            <br />
            <span className="text-[var(--color-verde)]">Telemedicina de baja de peso</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#3B6D11]">
            Acompañamiento médico, nutricional y psicológico para bajar de peso de forma segura y sostenible.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-[#27500A] sm:grid-cols-2">
            {[
              'Evaluación médica integral',
              'Plan personalizado',
              'Seguimiento semanal',
              'Resultados sostenibles',
              'Plan y rutinas de ejercicios en domicilio',
              'Atención y plan nutricional',
            ].map(
              (check) => (
                <span key={check} className="inline-flex items-center gap-2">
                  <SvgIcon name="check" className="h-4 w-4 text-[var(--color-verde)]" />
                  {check}
                </span>
              )
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAgendar}
              className="rounded-[10px] bg-[var(--color-verde)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#167F5E]"
            >
              Comenzar evaluación
            </button>
            <a
              href="#planes"
              className="rounded-[10px] border border-[var(--color-verde-borde)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-verde)] hover:bg-[#F6FBF0]"
            >
              Conocer el programa
            </a>
          </div>
        </div>

        <div id="planes">
          <SectionCard className="border-2 border-[var(--color-verde)] p-5">
            <span className="rounded-full bg-[var(--color-verde)] px-3 py-1 text-xs font-medium text-white">
              {plan.badge}
            </span>
            <p className="mt-4 text-3xl font-semibold text-[#173404]">{plan.price}</p>
            <p className="text-sm text-[#3B6D11]">{plan.term}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-[#27500A]">
                  <SvgIcon name="check" className="h-4 w-4 shrink-0 text-[var(--color-verde)]" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={openAgendar}
              className="mt-5 flex h-10 w-full items-center justify-center rounded-[10px] bg-[var(--color-verde)] text-sm font-semibold text-white hover:bg-[#167F5E]"
            >
              Comenzar ahora
            </button>
          </SectionCard>
        </div>
      </section>

      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Resultados promedios
        </p>
        <div className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-[var(--color-verde-borde)] bg-white md:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="border-r border-[var(--color-verde-borde)] px-4 py-4 text-center last:border-r-0">
              <p className="text-xl font-semibold text-[var(--color-verde)]">{value}</p>
              <p className="text-xs text-[var(--color-texto-3)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionCard className="p-5">
        <h2 className="text-xl font-semibold text-[var(--color-texto-1)]">¿Cómo funciona el programa?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {['Evaluación inicial', 'Plan personalizado', 'Seguimiento semanal', 'Resultados y mantención'].map(
            (step, index) => (
              <div key={step} className="text-center">
                <span
                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-white ${
                    index === 0 ? 'bg-[var(--color-verde)]' : 'bg-[var(--color-azul-primario)]'
                  }`}
                >
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--color-texto-1)]">{step}</p>
                <p className="mt-1 text-xs text-[var(--color-texto-3)]">Acompañamiento clínico y metas realistas.</p>
              </div>
            )
          )}
        </div>
      </SectionCard>

      <section id="calculadora-imc" className="grid gap-6 lg:grid-cols-2">
        <SectionCard className="p-5">
          <h2 className="text-xl font-semibold text-[var(--color-texto-1)]">Calcula tu IMC y peso saludable</h2>
          <p className="mt-1 text-sm text-[var(--color-texto-3)]">Ingresa tus datos y estima tu punto de partida.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--color-texto-2)]">
              Peso actual (kg)
              <input
                type="number"
                value={weight}
                onChange={(event) => setWeight(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 outline-none focus:border-[var(--color-verde-borde)]"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-texto-2)]">
              Estatura (cm)
              <input
                type="number"
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 outline-none focus:border-[var(--color-verde-borde)]"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-texto-2)]">
              Edad
              <input
                type="number"
                value={age}
                onChange={(event) => setAge(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 outline-none focus:border-[var(--color-verde-borde)]"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-texto-2)]">
              Sexo
              <select
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                className="mt-1 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 outline-none focus:border-[var(--color-verde-borde)]"
              >
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro</option>
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-[var(--color-texto-2)]">
            Objetivo de peso (kg)
            <input
              type="number"
              value={goal}
              onChange={(event) => setGoal(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-[8px] border border-[var(--color-borde-card)] px-3 outline-none focus:border-[var(--color-verde-borde)]"
            />
          </label>
          <button
            type="button"
            className="mt-5 w-full rounded-[10px] bg-[var(--color-verde)] px-4 py-3 text-sm font-semibold text-white hover:bg-[#167F5E]"
          >
            Calcular mi IMC ahora
          </button>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-semibold text-[var(--color-texto-1)]">Tu resultado estimado</h2>
          <div className="mt-5 rounded-[12px] bg-[var(--color-verde-claro)] p-5 text-center">
            <p className="text-[34px] font-semibold" style={{ color: result.color }}>
              {result.bmi.toFixed(1)}
            </p>
            <p className="text-sm font-medium text-[#27500A]">{result.category}</p>
          </div>
          <div className="mt-5 h-3 rounded-full bg-[#E5EAF0]">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${result.progress}%`, background: result.color }}
            />
          </div>
          <div className="mt-2 grid grid-cols-4 text-[10px] text-[var(--color-texto-3)]">
            <span>Bajo peso</span>
            <span>Normal</span>
            <span>Sobrepeso</span>
            <span>Obesidad</span>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[var(--color-borde-card)] pb-2">
              <span>Peso saludable ideal</span>
              <span className="font-semibold">{result.ideal.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between border-b border-[var(--color-borde-card)] pb-2">
              <span>Peso a perder</span>
              <span className="font-semibold">{result.toLose.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span>Tiempo estimado</span>
              <span className="font-semibold">{result.months} meses</span>
            </div>
          </div>
        </SectionCard>
      </section>

      <ProyeccionPeso pesoInicialDefault={weight} pesoMetaDefault={goal} />

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Equipo especializado
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Los profesionales de tu programa</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {team.map(([name, initials, specialty, exp, tone]) => (
            <SectionCard key={name} className="p-5 text-center">
              <InitialAvatar initials={initials} tone={tone as AvatarTone} />
              <p className="mt-3 text-sm font-semibold text-[var(--color-texto-1)]">{name}</p>
              <p className="mt-1 text-xs text-[var(--color-texto-3)]">{specialty}</p>
              <p className="mt-1 text-xs text-[var(--color-texto-4)]">{exp}</p>
              <div className="mt-2 flex justify-center">
                <RatingStars />
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">Casos de éxito</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Transformaciones reales</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ['95 kg', '78 kg', '6 meses', 'Volví a sentir energía y control de mi salud.'],
            ['108 kg', '89 kg', '8 meses', 'El acompañamiento semanal hizo la diferencia.'],
            ['82 kg', '65 kg', '7 meses', 'Pude sostener mis hábitos con ayuda del equipo.'],
          ].map(([before, after, time, text], index) => (
            <SectionCard key={text} className="p-5">
              <div className="flex items-center justify-between rounded-[12px] bg-[var(--color-verde-claro)] p-4">
                <span>
                  <span className="block text-lg font-semibold text-[#173404]">{before}</span>
                  <span className="text-xs text-[#3B6D11]">inicio</span>
                </span>
                <span className="text-sm text-[#3B6D11]">→</span>
                <span>
                  <span className="block text-lg font-semibold text-[#173404]">{after}</span>
                  <span className="text-xs text-[#3B6D11]">hoy</span>
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-[#27500A]">{time}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--color-texto-2)]">{text}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[var(--color-texto-3)]">
                  {['María R.', 'Roberto C.', 'Daniela P.'][index]}
                </span>
                <RatingStars />
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <section className="rounded-[16px] bg-[var(--color-verde-claro)] p-6">
        <h2 className="text-xl font-semibold text-[#173404]">Más que bajar de peso — transforma tu salud</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {benefits.map(([title, text]) => (
            <div key={title} className="rounded-[12px] bg-white p-4">
              <p className="text-sm font-semibold text-[#173404]">{title}</p>
              <p className="mt-1 text-xs text-[#3B6D11]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={openAgendar}
        className="fixed bottom-6 right-6 z-40 rounded-[12px] bg-[var(--color-verde)] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#167F5E]"
      >
        Agendar consulta
      </button>
    </div>
  );
}
