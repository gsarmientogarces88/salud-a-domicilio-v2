'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const MAIN_ACTIONS = [
  {
    icon: '🚨',
    title: 'Urgencia a Domicilio',
    desc: 'Atención médica rápida y confiable sin salir de tu hogar.',
    cta: 'Solicitar ahora',
    href: '/dashboard/patient/medico',
  },
  {
    icon: '📅',
    title: 'Agenda Médico a Domicilio',
    desc: 'Elige día, hora y profesional según tu necesidad.',
    cta: 'Agendar',
    href: '/dashboard/patient/medico/agendar',
  },
  {
    icon: '⚖️',
    title: 'Programa Médico Baja de Peso',
    desc: 'Accede a un plan médico personalizado para control de peso.',
    cta: 'Ver programa',
    href: '/dashboard/patient/baja-peso',
  },
  {
    icon: '🧪',
    title: 'Exámenes Médicos a Domicilio',
    desc: 'Solicita exámenes sin salir de tu hogar.',
    cta: 'Solicitar exámenes',
    href: '/dashboard/patient/examenes-domicilio',
  },
] as const;

export default function PacienteInicioPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">🏠</span>
            Bienvenido a Salud en Casa
          </h1>
          <p className="max-w-2xl text-gray-600">
            Somos la primera plataforma de atención médica a domicilio que integra servicios de urgencia, atención
            programada y exámenes médicos en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="relative rounded-full p-2 hover:bg-gray-100">
            <span className="text-xl">🔔</span>
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              1
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-sky-200 text-center leading-10 text-sky-700">
              👤
            </span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Servicios principales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MAIN_ACTIONS.map((item) => (
            <div
              key={item.href}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-sky-200"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-sky-50 text-3xl">
                {item.icon}
              </div>
              <h3 className="mb-1 font-semibold text-gray-900">{item.title}</h3>
              <p className="mb-4 flex-1 text-sm text-gray-600">{item.desc}</p>
              <Link
                href={item.href}
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
