'use client';

import { useState } from 'react';
import ScheduleModal, { type ScheduleLocationContext } from '@/components/medico/ScheduleModal';
import type { DoctorCard } from '@/components/medico/DoctorList';
import {
  FloatingAction,
  InitialAvatar,
  MockMap,
  Pill,
  RatingStars,
  SectionCard,
  StatusDot,
  SvgIcon,
} from '@/components/medicilio/MedicilioUI';

type AgendaIconName = Parameters<typeof SvgIcon>[0]['name'];

const specialties = [
  ['Medicina general', 'Desde $39.990', 'Disponible en 18 min', 'briefcase'],
  ['Pediatría', 'Desde $49.990', 'Disponible en 30 min', 'heart'],
  ['Cardiología', 'Desde $59.990', 'Disponible en 45 min', 'activity'],
  ['Psiquiatría', 'Desde $49.990', 'Disponible en 40 min', 'shield'],
  ['Traumatología', 'Desde $49.990', 'Disponible en 35 min', 'file'],
  ['Ginecología', 'Desde $45.990', 'Disponible en 30 min', 'user'],
  ['Dermatología', 'Desde $39.990', 'Disponible en 25 min', 'pulse'],
  ['Medicina interna', 'Desde $55.990', 'Disponible en 40 min', 'crosshair'],
] as const;

const doctors: (DoctorCard & {
  initials: string;
  badge: string;
  tone: 'blue' | 'green' | 'purple' | 'amber';
  price: string;
  eta: string;
  experience: string;
})[] = [
  {
    id: '1',
    name: 'Dr. Carlos Muñoz',
    specialty: 'Medicina General',
    initials: 'CM',
    badge: 'Más solicitado',
    tone: 'blue',
    price: '$39.990',
    eta: 'Llega en 15 min',
    experience: '12 años exp.',
    availabilityLabel: 'Disponible ahora',
    ratingAverage: 4.9,
    ratingCount: 142,
  },
  {
    id: '2',
    name: 'Dra. Ana Pérez',
    specialty: 'Pediatría',
    initials: 'AP',
    badge: 'Alta valoración',
    tone: 'green',
    price: '$44.990',
    eta: 'Llega en 22 min',
    experience: '8 años exp.',
    availabilityLabel: 'Disponible ahora',
    ratingAverage: 5.0,
    ratingCount: 98,
  },
  {
    id: '3',
    name: 'Dr. Felipe Lagos',
    specialty: 'Medicina General',
    initials: 'FL',
    badge: 'SIS activo',
    tone: 'purple',
    price: '$39.990',
    eta: 'Llega en 24 min',
    experience: '6 años exp.',
    availabilityLabel: 'Disponible ahora',
    ratingAverage: 4.8,
    ratingCount: 64,
  },
  {
    id: '4',
    name: 'Dra. María Torres',
    specialty: 'Geriatría',
    initials: 'MT',
    badge: 'Especialista',
    tone: 'amber',
    price: '$49.990',
    eta: 'Llega en 28 min',
    experience: '11 años exp.',
    availabilityLabel: 'Disponible ahora',
    ratingAverage: 4.9,
    ratingCount: 80,
  },
];

const reasons = [
  ['Profesionales verificados', 'Registro SIS activo', 'shield'],
  ['Atención en domicilio', 'Sin traslado ni filas', 'home'],
  ['Pago seguro Webpay', 'Bono Isapre o efectivo', 'lock'],
  ['Receta médica digital', 'Documentos al finalizar', 'file'],
  ['Adultos y niños', 'Pediatría disponible', 'heart'],
  ['Cobertura Gran Concepción', 'Talcahuano y comunas', 'pin'],
] as const;

export default function AgendarPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('Medicina general');
  const [modalDoctor, setModalDoctor] = useState<DoctorCard | null>(null);
  const [location, setLocation] = useState<ScheduleLocationContext>({
    region: 'Biobío',
    province: 'Concepción',
    commune: 'Concepción',
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[16px] bg-[var(--color-azul-claro)] p-8 lg:grid-cols-[1.55fr_0.75fr]">
        <div>
          <Pill>
            <StatusDot />
            12 médicos disponibles ahora · Gran Concepción
          </Pill>
          <h1 className="mt-5 text-[38px] font-semibold leading-tight text-[var(--color-azul-oscuro)]">
            Agenda tu médico
            <br />
            a domicilio
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-texto-2)]">
            Profesionales verificados disponibles cerca de tu ubicación. Elige día, hora y especialidad.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ['12', 'Médicos disponibles'],
              ['4.9/5', 'Valoración promedio'],
              ['20 min', 'Tiempo promedio'],
              ['+5.000', 'Atenciones realizadas'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[10px] border border-[var(--color-azul-borde)] bg-white p-4">
                <p className="text-xl font-semibold text-[var(--color-azul-primario)]">{value}</p>
                <p className="text-xs text-[var(--color-texto-3)]">{label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-azul-primario)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0C447C]"
          >
            <SvgIcon name="search" className="h-4 w-4" />
            Encontrar médico ahora
          </button>
        </div>

        <SectionCard className="p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-texto-2)]">Médicos cerca de ti</span>
            <span className="flex items-center gap-1 text-[var(--color-verde)]">
              <StatusDot />
              En vivo
            </span>
          </div>
          <MockMap height={140} />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span>
              Más cercano: <span className="font-semibold text-[var(--color-azul-primario)]">15 min</span>
            </span>
            <button
              type="button"
              className="rounded-[8px] border border-[var(--color-azul-borde)] px-3 py-1.5 text-[var(--color-azul-primario)]"
            >
              Detectar
            </button>
          </div>
        </SectionCard>
      </section>

      <SectionCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <SvgIcon
              name="search"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-texto-4)]"
            />
            <input
              className="h-11 w-full rounded-[8px] border border-[var(--color-borde-card)] bg-[#F9FAFB] pl-10 pr-3 text-sm outline-none focus:border-[var(--color-azul-borde)]"
              placeholder="Buscar especialidad o nombre de médico..."
            />
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] px-4 text-sm font-medium text-[var(--color-azul-primario)]"
          >
            <SvgIcon name="crosshair" className="h-4 w-4" />
            Detectar mi ubicación
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--color-azul-primario)] px-4 text-sm font-semibold text-white"
          >
            <SvgIcon name="search" className="h-4 w-4" />
            Buscar médicos
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Disponible ahora', 'Mejor evaluados', 'Menor precio', 'Llegada más rápida', 'Especialistas'].map(
            (filter, index) => (
              <button
                key={filter}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  index === 0
                    ? 'border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] text-[#0C447C]'
                    : 'border-[var(--color-borde-card)] bg-white text-[var(--color-texto-3)]'
                }`}
              >
                {filter}
              </button>
            )
          )}
        </div>
      </SectionCard>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Especialidades disponibles
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">¿Qué tipo de médico necesitas?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {specialties.map(([title, price, eta, icon]) => {
            const selected = selectedSpecialty === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedSpecialty(title)}
                className={`rounded-[14px] border p-5 text-center hover:border-[var(--color-azul-borde)] hover:shadow-[0_2px_12px_rgba(24,95,165,0.08)] ${
                  selected
                    ? 'border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)]'
                    : 'border-[var(--color-borde-card)] bg-white'
                }`}
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-[var(--color-azul-primario)]">
                  <SvgIcon name={icon} className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-texto-1)]">{title}</span>
                <span className="mt-1 block text-xs font-medium text-[var(--color-azul-primario)]">{price}</span>
                <span className="mt-1 block text-xs text-[var(--color-texto-3)]">{eta}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
              Médicos disponibles
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Profesionales cerca de ti</h2>
          </div>
          <span className="text-sm text-[var(--color-texto-3)]">8 profesionales encontrados en la zona</span>
        </div>
        <div className="mt-5 space-y-4">
          {doctors.map((doctor, index) => (
            <article
              key={doctor.id}
              className={`rounded-[14px] border bg-white p-5 ${
                index === 0 ? 'border-2 border-[var(--color-azul-primario)]' : 'border-[var(--color-borde-card)]'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <InitialAvatar initials={doctor.initials} tone={doctor.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-texto-1)]">{doctor.name}</h3>
                    <span className="rounded-full bg-[var(--color-verde-claro)] px-2 py-1 text-[10px] font-medium text-[#27500A]">
                      {doctor.badge}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-texto-3)]">{doctor.specialty}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-texto-3)]">
                    <span className="inline-flex items-center gap-1">
                      <RatingStars /> {doctor.ratingAverage}
                    </span>
                    <span>{doctor.ratingCount} atenciones</span>
                    <span>{doctor.experience}</span>
                    <span>{doctor.eta}</span>
                    <span>Registro SIS activo</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[var(--color-azul-primario)]">{doctor.price}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDoctor(doctor)}
                  className="rounded-[10px] bg-[var(--color-azul-primario)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C447C]"
                >
                  Agendar ahora
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[16px] bg-[var(--color-azul-claro)] p-6">
        <h2 className="text-xl font-semibold text-[var(--color-texto-1)]">Todo lo que incluye tu atención</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-3)]">
          Cada reserva incluye protección, información clara y seguimiento.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {reasons.map(([title, text, icon]) => (
            <SectionCard key={title} className="flex gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
                <SvgIcon name={icon as AgendaIconName} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--color-texto-1)]">{title}</span>
                <span className="text-xs text-[var(--color-texto-3)]">{text}</span>
              </span>
            </SectionCard>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Testimonios verificados
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Lo que dicen quienes ya agendaron</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            'Agendé al Dr. Muñoz en 2 minutos. Llegó puntual y explicó todo con mucha claridad.',
            'La Dra. Pérez tuvo muy buen trato con mi hija. Pude elegir la hora que me acomodaba.',
            'Me sentí segura desde el inicio. Proceso simple y pago protegido.',
          ].map((text, index) => (
            <SectionCard key={text} className="p-5">
              <p className="text-5xl leading-none text-[var(--color-azul-borde)]">“</p>
              <p className="-mt-3 text-sm leading-6 text-[var(--color-texto-2)]">{text}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-texto-3)]">
                  {['María S.', 'Valentina C.', 'Claudia P.'][index]}
                </span>
                <RatingStars />
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <ScheduleModal
        isOpen={!!modalDoctor}
        onClose={() => setModalDoctor(null)}
        doctor={modalDoctor}
        location={location}
        onLocationRegion={(region) => setLocation((prev) => ({ ...prev, region }))}
        onLocationProvince={(province) => setLocation((prev) => ({ ...prev, province }))}
        onLocationCommune={(commune) => setLocation((prev) => ({ ...prev, commune }))}
      />
      <FloatingAction href="/dashboard/patient/medico/agendar">Encontrar médico ahora</FloatingAction>
    </div>
  );
}
