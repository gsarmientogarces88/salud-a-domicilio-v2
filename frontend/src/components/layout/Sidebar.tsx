'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDoctorRequests } from '@/context/DoctorRequestsContext';

const LINKS: Record<string, { href: string; label: string; icon: string }[]> = {
  PATIENT: [
    { href: '/dashboard/patient', label: 'Inicio', icon: '🏠' },
    { href: '/dashboard/patient/agenda', label: 'Agenda a Domicilio', icon: '📅' },
    { href: '/dashboard/patient/examenes-domicilio', label: 'Exámenes a Domicilio', icon: '🧪' },
    { href: '/dashboard/patient/consultas', label: 'Consultas', icon: '👥' },
    { href: '/dashboard/patient/resultados-examenes', label: 'Resultados de Exámenes', icon: '🔬' },
    { href: '/dashboard/patient/pagos', label: 'Pagos', icon: '💰' },
    { href: '/dashboard/patient/mensajes', label: 'Mensajes', icon: '💬' },
    { href: '/dashboard/patient/perfil', label: 'Perfil', icon: '👤' },
    { href: '/dashboard/patient/soporte', label: 'Soporte', icon: '⚙️' },
  ],
  DOCTOR: [
    { href: '/dashboard/doctor', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/doctor/requests', label: 'Solicitudes', icon: '📥' },
    { href: '/dashboard/doctor/my-consultations', label: 'Mis atenciones', icon: '🩺' },
    { href: '/dashboard/doctor/agenda', label: 'Agenda', icon: '📅' },
    { href: '/dashboard/doctor/agenda-requests', label: 'Solicitudes Agenda', icon: '📋' },
    { href: '/dashboard/doctor/settings', label: 'Configuración', icon: '⚙️' },
    { href: '/dashboard/doctor/metrics', label: 'Métricas', icon: '📈' },
    { href: '/dashboard/doctor/earnings', label: 'Ingresos', icon: '💰' },
  ],
  ADMIN: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/admin/users', label: 'Usuarios', icon: '👥' },
    { href: '/dashboard/admin/services', label: 'Servicios', icon: '🩺' },
    { href: '/dashboard/admin/config', label: 'Configuración', icon: '⚙️' },
  ],
  LABORATORY: [
    { href: '/dashboard/laboratorio', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/laboratorio/solicitudes', label: 'Solicitudes', icon: '📋' },
    { href: '/dashboard/laboratorio/agenda', label: 'Agenda', icon: '📅' },
    { href: '/dashboard/laboratorio/resultados', label: 'Resultados', icon: '🧾' },
    { href: '/dashboard/laboratorio/configuracion', label: 'Configuración', icon: '⚙️' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const doctorRequests = useDoctorRequests();
  const links = LINKS[user?.role || 'PATIENT'] || LINKS.PATIENT;

  const isPatient = user?.role === 'PATIENT';
  const isLaboratory = user?.role === 'LABORATORY';

  return (
    <aside
      className={`relative flex w-56 flex-col p-6 ${
        isPatient
          ? 'bg-gradient-to-b from-sky-200 to-sky-100'
          : 'border-r bg-white'
      }`}
    >
      {isPatient && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0C13.4 0 0 13.4 0 30s13.4 30 30 30 30-13.4 30-30S46.6 0 30 0zm0 54c-13.2 0-24-10.8-24-24S16.8 6 30 6s24 10.8 24 24-10.8 24-24 24z' fill='%2306b6d4' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />
      )}
      <div className="relative z-10 mb-8 flex items-center gap-2">
        <span className="text-3xl">🏠</span>
        <span className="text-xl font-bold text-sky-800">SALUD EN CASA</span>
      </div>
      <ul className="relative z-10 flex-1 space-y-1">
        {links.map((l) => {
          const isActive =
            pathname === l.href ||
            (l.href !== '/dashboard/patient' &&
              l.href !== '/dashboard/laboratorio' &&
              pathname.startsWith(l.href));
          const isDoctorRequestsLink =
            user?.role === 'DOCTOR' &&
            doctorRequests.enabled &&
            l.href === '/dashboard/doctor/requests';
          const showPendingBadge =
            isDoctorRequestsLink && doctorRequests.pendingCount > 0 && !isActive;
          const blinkRequests =
            isDoctorRequestsLink && doctorRequests.shouldBlinkRequestsNav && !isActive;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  blinkRequests ? 'ring-2 ring-amber-400/70 ring-offset-1 animate-pulse' : ''
                } ${
                  isActive
                    ? isPatient
                      ? 'bg-sky-600 text-white'
                      : 'bg-primary text-white'
                    : isPatient
                    ? 'text-sky-800 hover:bg-sky-200/60'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-primary'
                }`}
              >
                <span className="text-lg">{l.icon}</span>
                <span className="flex-1">{l.label}</span>
                {showPendingBadge ? (
                  <span className="flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                    {doctorRequests.pendingCount > 99 ? '99+' : doctorRequests.pendingCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {isPatient && (
        <button
          onClick={() => { logout(); router.push('/auth/login'); }}
          className="relative z-10 mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sky-800 hover:bg-sky-200/60"
        >
          <span>🚪</span>
          Salir
        </button>
      )}
      {isLaboratory && (
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/auth/laboratorio/login');
          }}
          className="relative z-10 mt-auto flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100"
        >
          <span>🚪</span>
          Salir
        </button>
      )}
    </aside>
  );
}
