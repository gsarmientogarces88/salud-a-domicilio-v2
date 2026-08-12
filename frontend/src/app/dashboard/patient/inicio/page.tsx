'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  FloatingAction,
  InitialAvatar,
  Pill,
  RatingStars,
  SectionCard,
  StatusDot,
  SvgIcon,
  defaultMetrics,
} from '@/components/medicilio/MedicilioUI';

type NearbyDoctor = {
  id: string;
  name: string;
  specialty: string;
  initials: string;
  ratingAverage: number;
  ratingCount: number;
  etaMinutes: number;
  distanceKm: number | null;
};

type ProfessionalApi = {
  id: string;
  specialty?: string | null;
  yearsExperience?: number | null;
  distanceKm?: number | null;
  ratingAverage?: number;
  ratingCount?: number;
  user?: { firstName?: string | null; lastName?: string | null };
};

const ROTATE_MS = 4000;
const MAX_FEATURED_DOCTORS = 5;

const fallbackDoctors: NearbyDoctor[] = [
  {
    id: 'fallback-1',
    name: 'Dr. Carlos Muñoz',
    specialty: 'Médico General · 8 años exp.',
    initials: 'CM',
    ratingAverage: 4.9,
    ratingCount: 142,
    etaMinutes: 14,
    distanceKm: null,
  },
];

function initialsFromName(name: string) {
  const parts = name
    .replace(/^Dr\.?\s*/i, '')
    .replace(/^Dra\.?\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function etaFromDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return 15;
  return Math.max(10, Math.min(25, Math.round(distanceKm * 3 + 10)));
}

function pickRandomDoctors(list: NearbyDoctor[], max = MAX_FEATURED_DOCTORS) {
  if (list.length <= max) return list;
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, max);
}

function mapNearbyDoctor(p: ProfessionalApi): NearbyDoctor {
  const firstName = (p.user?.firstName || '').trim();
  const lastName = (p.user?.lastName || '').trim();
  const full = [firstName, lastName].filter(Boolean).join(' ') || 'Médico disponible';
  const name = `Dr. ${full}`;
  const years =
    typeof p.yearsExperience === 'number' && p.yearsExperience > 0
      ? ` · ${p.yearsExperience} años exp.`
      : '';
  return {
    id: p.id,
    name,
    specialty: `${p.specialty || 'Medicina General'}${years}`,
    initials: initialsFromName(name),
    ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 4.8,
    ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 24,
    etaMinutes: etaFromDistance(p.distanceKm),
    distanceKm: typeof p.distanceKm === 'number' ? p.distanceKm : null,
  };
}

function readBrowserCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 },
    );
  });
}

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
  const [doctors, setDoctors] = useState<NearbyDoctor[]>(fallbackDoctors);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [metrics, setMetrics] = useState(defaultMetrics);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const res = await apiFetch<{
          data: {
            patientsAttendedDisplay?: string;
            professionalsActiveDisplay?: string;
            professionalsRegisteredDisplay?: string;
          };
        }>('/public/stats');
        if (cancelled || !res?.data) return;
        const patients = res.data.patientsAttendedDisplay || defaultMetrics[0].value;
        const professionals =
          res.data.professionalsActiveDisplay ||
          res.data.professionalsRegisteredDisplay ||
          defaultMetrics[1].value;
        setMetrics([
          { value: patients, label: 'Pacientes atendidos' },
          { value: professionals, label: 'Profesionales activos' },
          defaultMetrics[2],
          defaultMetrics[3],
        ]);
      } catch {
        // Mantener métricas de respaldo
      }
    };

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const coords = await readBrowserCoords();
        const params = new URLSearchParams();
        if (coords) {
          params.set('forAgenda', '1');
          params.set('lat', String(coords.lat));
          params.set('lng', String(coords.lng));
        }
        const res = await apiFetch<{ data: ProfessionalApi[] }>(
          `/professionals${params.toString() ? `?${params.toString()}` : ''}`,
        );
        if (cancelled) return;
        const mapped = (res.data || []).map(mapNearbyDoctor);
        if (mapped.length > 0) {
          setDoctors(pickRandomDoctors(mapped, MAX_FEATURED_DOCTORS));
          setActiveIndex(0);
        }
      } catch {
        // Mantener fallback visual si no hay médicos / sin sesión GPS
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (doctors.length <= 1) return;
    const timer = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % doctors.length);
        setFade(true);
      }, 180);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [doctors]);

  const activeDoctor = doctors[activeIndex] || doctors[0] || fallbackDoctors[0];
  const isFallback = doctors.length === 1 && doctors[0]?.id.startsWith('fallback');

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[16px] bg-[var(--color-azul-claro)] p-8 lg:grid-cols-[1.6fr_0.9fr]">
        <div>
          <Pill>
            <StatusDot />
            {isFallback ? 'Médicos disponibles · Gran Concepción' : 'Algunos de nuestros médicos · Gran Concepción'}
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
          <div className="mt-6 w-[190px] rounded-[10px] border border-[var(--color-azul-borde)] bg-white p-4">
            <p className="text-xs font-medium text-[var(--color-texto-3)]">Urgencia a domicilio</p>
            <p className="mt-1 text-[22px] font-semibold text-[var(--color-azul-oscuro)]">$50.000</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-texto-3)]">
              <SvgIcon name="card" className="h-3.5 w-3.5" />
              Webpay · Isapre · Efectivo
            </p>
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

        <div className="space-y-4">
          <SectionCard className="p-5">
            <p className="mb-3 text-xs font-medium text-[var(--color-texto-3)]">
              Estos son algunos de nuestros médicos
            </p>
            <div
              className={`transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}
              key={activeDoctor.id}
            >
              <div className="flex items-start gap-3">
                <InitialAvatar initials={activeDoctor.initials} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-texto-1)]">{activeDoctor.name}</p>
                  <p className="text-xs text-[var(--color-texto-3)]">{activeDoctor.specialty}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-texto-3)]">
                    <RatingStars />
                    {activeDoctor.ratingAverage.toFixed(1)} · {activeDoctor.ratingCount}
                    {activeDoctor.distanceKm != null ? (
                      <span>· A {activeDoctor.distanceKm.toFixed(1)} km</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[10px] bg-[var(--color-azul-claro)] p-4">
                <p className="text-xs text-[var(--color-texto-3)]">Tiempo estimado de llegada</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-semibold text-[var(--color-azul-primario)]">
                    {activeDoctor.etaMinutes} minutos
                  </span>
                  <span className="rounded-full bg-[var(--color-verde-claro)] px-3 py-1 text-xs font-medium text-[#27500A]">
                    Disponible
                  </span>
                </div>
              </div>
            </div>
            {doctors.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {doctors.map((doctor, index) => (
                  <span
                    key={doctor.id}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? 'w-4 bg-[var(--color-azul-primario)]'
                        : 'w-1.5 bg-[var(--color-azul-borde)]'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </SectionCard>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[14px] border border-[var(--color-borde-card)] bg-white p-4 text-center">
                <p className="text-lg font-semibold text-[var(--color-azul-primario)]">{metric.value}</p>
                <p className="text-xs text-[var(--color-texto-3)]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-borde-card)] bg-white px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-[var(--color-texto-2)]">
          <StatusDot />
          Médicos disponibles ahora · Tiempo estimado: 15–20 minutos
        </span>
        <span className="text-xs text-[var(--color-texto-3)]">
          {metrics[0].value} pacientes atendidos · Calificación promedio 4.9/5
        </span>
      </div>

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
