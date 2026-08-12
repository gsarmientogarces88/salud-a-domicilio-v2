'use client';

import Link from 'next/link';
import {
  FloatingAction,
  MetricsStrip,
  Pill,
  StatusDot,
  SvgIcon,
  defaultMetrics,
} from '@/components/medicilio/MedicilioUI';

const heroServices = [
  {
    title: 'Servicio de Urgencia',
    price: '$50.000',
    meta: '15–20 min',
    href: '/dashboard/patient/medico',
  },
  {
    title: 'Servicio Agenda Médico',
    price: 'desde $39.990',
    meta: 'A elección',
    href: '/dashboard/patient/medico/agendar',
  },
  {
    title: 'Programa Baja de Peso',
    price: 'Ver plan',
    meta: 'Mensual',
    href: '/dashboard/patient/baja-peso',
  },
] as const;

const quickAccess = [
  ['Mi historial', 'clock', '/dashboard/patient/consultas'],
  ['Mis resultados', 'chart', '/dashboard/patient/resultados-examenes'],
  ['Mi perfil', 'user', '/dashboard/patient/perfil'],
  ['Soporte', 'shield', '/dashboard/patient/soporte'],
] as const;

const services = [
  {
    title: 'Urgencia a domicilio',
    body: 'Médico inmediato para síntomas que no pueden esperar.',
    href: '/dashboard/patient/medico',
    cta: 'Solicitar ahora',
    icon: 'briefcase',
    badge: 'Urgencia',
    tone: 'red',
    price: '$50.000',
    meta: '15–20 min',
  },
  {
    title: 'Agenda médico',
    body: 'Reserva para el día y hora que prefieras.',
    href: '/dashboard/patient/medico/agendar',
    cta: 'Agendar',
    icon: 'calendar',
    badge: 'Popular',
    tone: 'blue',
    price: '$39.990',
    meta: 'A elección',
  },
  {
    title: 'Baja de peso',
    body: 'Plan médico personalizado con seguimiento mensual.',
    href: '/dashboard/patient/baja-peso',
    cta: 'Ver plan',
    icon: 'scale',
    badge: 'Nuevo',
    tone: 'green',
    price: '$79.990',
    meta: 'Mensual',
  },
] as const;

const trust = [
  ['Médicos con Registro SIS activo', 'shield', 'blue'],
  ['Pago seguro con Webpay', 'lock', 'green'],
  ['Seguimiento en tiempo real', 'activity', 'amber'],
  ['Historial clínico digital seguro', 'file', 'purple'],
] as const;

export default function PacienteInicioPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[16px] bg-[var(--color-azul-claro)] p-8 lg:grid-cols-[1.6fr_0.9fr]">
        <div>
          <Pill>
            <StatusDot />
            3 médicos disponibles · Gran Concepción
          </Pill>
          <h1 className="mt-5 max-w-xl text-[38px] font-semibold leading-tight text-[var(--color-azul-oscuro)]">
            Atención médica
            <br />
            en tu hogar.
            <br />
            <span className="text-[var(--color-azul-primario)]">En 15–20 minutos.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-texto-2)]">
            Médicos certificados con registro SIS activo. Sin filas, sin traslado, sin espera.
          </p>
          <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
            {heroServices.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="rounded-[10px] border border-[var(--color-azul-borde)] bg-white p-4 transition hover:border-[var(--color-azul-primario)] hover:shadow-[0_2px_12px_rgba(24,95,165,0.08)]"
              >
                <p className="text-xs font-medium text-[var(--color-texto-3)]">{service.title}</p>
                <p className="mt-1 text-[18px] font-semibold leading-tight text-[var(--color-azul-oscuro)]">{service.price}</p>
                <p className="mt-1 text-xs text-[var(--color-texto-3)]">{service.meta}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Registro SIS activo', 'Webpay seguro', '24/7', 'Médicos certificados'].map((item) => (
              <Pill key={item} tone="gray">{item}</Pill>
            ))}
          </div>
          <Link
            href="/dashboard/patient/medico"
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-azul-primario)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0C447C]"
          >
            <SvgIcon name="plus" className="h-4 w-4" />
            Solicitar atención ahora
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 content-start">
          {defaultMetrics.map((metric) => (
            <div key={metric.label} className="rounded-[14px] border border-[var(--color-borde-card)] bg-white p-4 text-center">
              <p className="text-lg font-semibold text-[var(--color-azul-primario)]">{metric.value}</p>
              <p className="text-xs text-[var(--color-texto-3)]">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-borde-card)] bg-white px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-[var(--color-texto-2)]">
          <StatusDot />
          Médicos disponibles ahora · Tiempo estimado: 15–20 minutos
        </span>
        <span className="text-xs text-[var(--color-texto-3)]">+3.200 pacientes atendidos · Calificación promedio 4.9/5</span>
      </div>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">Acceso rápido</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">¿Qué necesitas hoy?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {quickAccess.map(([label, icon, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-[14px] border border-[var(--color-borde-card)] bg-white p-5 text-center hover:border-[var(--color-azul-borde)] hover:shadow-[0_2px_12px_rgba(24,95,165,0.08)]"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
                <SvgIcon name={icon} className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-medium text-[var(--color-texto-2)]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">Servicios disponibles</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">¿Qué más necesitas?</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-3)]">Todos con profesional verificado y boleta electrónica.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className={`rounded-[14px] border bg-white p-5 ${
                service.tone === 'red' ? 'border-[var(--color-rojo-borde)]' : 'border-[var(--color-borde-card)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${
                    service.tone === 'red'
                      ? 'bg-[var(--color-rojo-claro)] text-[var(--color-rojo-urgencia)]'
                      : service.tone === 'green'
                        ? 'bg-[var(--color-verde-claro)] text-[var(--color-verde)]'
                        : 'bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]'
                  }`}
                >
                  <SvgIcon name={service.icon} className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                    service.tone === 'red'
                      ? 'bg-[var(--color-rojo-claro)] text-[var(--color-rojo-urgencia)]'
                      : service.tone === 'green'
                        ? 'bg-[var(--color-verde-claro)] text-[#27500A]'
                        : 'bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]'
                  }`}
                >
                  {service.badge}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--color-texto-1)]">{service.title}</h3>
              <p className="mt-2 min-h-[42px] text-sm text-[var(--color-texto-3)]">{service.body}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-texto-3)]">
                <span className="inline-flex items-center gap-1">
                  <SvgIcon name="clock" className="h-3.5 w-3.5" />
                  {service.meta}
                </span>
                <span className="font-semibold text-[var(--color-azul-primario)]">{service.price}</span>
              </div>
              <Link
                href={service.href}
                className={`mt-4 flex h-10 items-center justify-center rounded-[10px] text-sm font-medium ${
                  service.tone === 'red'
                    ? 'bg-[var(--color-rojo-claro)] text-[var(--color-rojo-urgencia)] hover:bg-[#F9DCDC]'
                    : 'bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)] hover:bg-[#D8EAF8]'
                }`}
              >
                {service.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <MetricsStrip items={defaultMetrics} />

      <div className="grid gap-3 rounded-[14px] border border-[var(--color-borde-card)] bg-white p-4 md:grid-cols-4">
        {trust.map(([label, icon, tone]) => (
          <div key={label} className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${
                tone === 'green'
                  ? 'bg-[var(--color-verde-claro)] text-[var(--color-verde)]'
                  : tone === 'amber'
                    ? 'bg-[#FAEEDA] text-[#9A6A18]'
                    : tone === 'purple'
                      ? 'bg-[#EEEDFE] text-[#6153B8]'
                      : 'bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]'
              }`}
            >
              <SvgIcon name={icon} className="h-5 w-5" />
            </span>
            <span className="text-sm text-[var(--color-texto-2)]">{label}</span>
          </div>
        ))}
      </div>

      <FloatingAction href="/dashboard/patient/medico">Solicitar atención ahora</FloatingAction>
    </div>
  );
}
