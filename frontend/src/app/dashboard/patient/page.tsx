'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const ATENCION_CLINICA = [
  { id: 'agenda', label: 'Agenda a Domicilio', desc: 'Kine, enfermería, psicología, TO, nutrición. Pagas cuando el profesional confirma.', icon: '📅', href: '/dashboard/patient/agenda' as const },
  { id: 'medico', label: 'Médico', desc: 'Consulta general con un doctor.', icon: '👨‍⚕️', href: '/dashboard/patient/medico' as const },
  { id: 'nutricionista', label: 'Nutricionista', desc: 'Asesoría alimentaria y dietética.', icon: '🥗', href: '/dashboard/patient/consultas?servicio=nutricionista' as const },
  { id: 'kinesiologo', label: 'Kinesiólogo', desc: 'Terapia física y rehabilitación.', icon: '🩺', href: '/dashboard/patient/consultas?servicio=kinesiologo' as const },
  { id: 'enfermeria', label: 'Enfermería', desc: 'Cuidados e inyecciones a domicilio.', icon: '💉', href: '/dashboard/patient/consultas?servicio=enfermeria' as const },
  { id: 'psicologo', label: 'Psicólogo', desc: 'Apoyo psicológico y terapia.', icon: '🧠', href: '/dashboard/patient/consultas?servicio=psicologo' as const },
  { id: 'terapeuta', label: 'Terapeuta Ocupacional', desc: 'Apoyo en actividades de la vida diaria.', icon: '🧩', href: '/dashboard/patient/consultas?servicio=terapeuta' as const },
];

const VISIBLE_ATENCION_CLINICA = new Set(['medico', 'nutricionista']);

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="text-3xl">📋</span>
            Solicitar Consulta Médica
          </h1>
          <p className="text-gray-600">
            Programa una visita a domicilio eligiendo el tipo de servicio que necesitas.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 hover:bg-gray-100">
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

      {/* Atención Clínica */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Atención Clínica</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATENCION_CLINICA.filter((s) => VISIBLE_ATENCION_CLINICA.has(s.id)).map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="group flex flex-col rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-sky-200"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-sky-50 text-3xl group-hover:bg-sky-100">
                {s.icon}
              </div>
              <h3 className="mb-1 font-semibold text-gray-900">{s.label}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Laboratorio</h2>
        <Link
          href="/dashboard/patient/examenes-domicilio"
          className="group flex items-center gap-4 rounded-xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-sky-200"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sky-50 text-3xl group-hover:bg-sky-100">
            🧪
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Exámenes a Domicilio</h3>
            <p className="text-sm text-gray-600">Orden médica, cotización y seguimiento en un solo lugar.</p>
          </div>
        </Link>
      </section>

      {/* Bottom info bar */}
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          Podrás pagar con Bono de Isapre o en línea tras confirmar disponibilidad del profesional.{' '}
          <Link href="#" className="font-medium text-sky-600 hover:underline">
            Ve cómo funciona →
          </Link>
        </p>
      </div>
    </div>
  );
}
