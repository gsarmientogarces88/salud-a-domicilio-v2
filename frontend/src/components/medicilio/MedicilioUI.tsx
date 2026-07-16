'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

type IconName =
  | 'pin'
  | 'phone'
  | 'pulse'
  | 'bell'
  | 'user'
  | 'home'
  | 'briefcase'
  | 'calendar'
  | 'scale'
  | 'flask'
  | 'clock'
  | 'file'
  | 'chart'
  | 'card'
  | 'message'
  | 'settings'
  | 'shield'
  | 'logout'
  | 'plus'
  | 'search'
  | 'crosshair'
  | 'check'
  | 'shuffle'
  | 'ambulance'
  | 'heart'
  | 'star'
  | 'trophy'
  | 'lock'
  | 'activity';

interface IconProps {
  name: IconName;
  className?: string;
}

export function SvgIcon({ name, className = 'h-4 w-4' }: IconProps) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  const stroke = 'currentColor';
  const strokeProps = { stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'pin':
      return <svg {...common}><path {...strokeProps} d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" fill="currentColor" /></svg>;
    case 'phone':
      return <svg {...common}><path {...strokeProps} d="M6.5 4.8 8.7 4l2.1 4.4-1.5 1.1c.9 1.8 2.3 3.2 4.1 4.1l1.2-1.5 4.4 2.1-.8 2.2c-.4 1-1.4 1.6-2.5 1.4C10.3 17 6.8 13.5 6 8.3c-.2-1.1.5-2.1 1.5-2.5Z" /></svg>;
    case 'pulse':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity=".12" /><path {...strokeProps} d="M6.5 12h3l1.4-4 2.3 8 1.5-4H18" /></svg>;
    case 'bell':
      return <svg {...common}><path {...strokeProps} d="M18 10a6 6 0 1 0-12 0c0 4-1.8 4.8-1.8 4.8h15.6S18 14 18 10Z" /><path {...strokeProps} d="M10 19a2 2 0 0 0 4 0" /></svg>;
    case 'user':
      return <svg {...common}><circle {...strokeProps} cx="12" cy="8" r="3.2" /><path {...strokeProps} d="M5.8 19c.8-3.4 3-5.1 6.2-5.1s5.4 1.7 6.2 5.1" /></svg>;
    case 'home':
      return <svg {...common}><path {...strokeProps} d="m4 11 8-7 8 7" /><path {...strokeProps} d="M6.5 10.5V20h11v-9.5" /><path {...strokeProps} d="M10 20v-5h4v5" /></svg>;
    case 'briefcase':
      return <svg {...common}><rect {...strokeProps} x="4" y="7" width="16" height="12" rx="2" /><path {...strokeProps} d="M9 7V5h6v2M4 12h16" /></svg>;
    case 'calendar':
      return <svg {...common}><rect {...strokeProps} x="4" y="5" width="16" height="15" rx="2" /><path {...strokeProps} d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case 'scale':
      return <svg {...common}><path {...strokeProps} d="M12 4v16M6 7h12M8 7l-3 6h6L8 7ZM16 7l-3 6h6l-3-6Z" /></svg>;
    case 'flask':
      return <svg {...common}><path {...strokeProps} d="M9 3h6M10 3v6l-4.5 8A2 2 0 0 0 7.2 20h9.6a2 2 0 0 0 1.7-3L14 9V3" /><path {...strokeProps} d="M7.5 16h9" /></svg>;
    case 'clock':
      return <svg {...common}><circle {...strokeProps} cx="12" cy="12" r="8" /><path {...strokeProps} d="M12 7.5V12l3 2" /></svg>;
    case 'file':
      return <svg {...common}><path {...strokeProps} d="M7 3h7l3 3v15H7z" /><path {...strokeProps} d="M14 3v4h4M9 12h6M9 16h6" /></svg>;
    case 'chart':
      return <svg {...common}><path {...strokeProps} d="M5 19V5M10 19v-8M15 19V8M20 19V3" /></svg>;
    case 'card':
      return <svg {...common}><rect {...strokeProps} x="4" y="6" width="16" height="12" rx="2" /><path {...strokeProps} d="M4 10h16M7 15h3" /></svg>;
    case 'message':
      return <svg {...common}><path {...strokeProps} d="M5 6h14v9H9l-4 4V6Z" /></svg>;
    case 'settings':
      return <svg {...common}><circle {...strokeProps} cx="12" cy="12" r="3" /><path {...strokeProps} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>;
    case 'shield':
      return <svg {...common}><path {...strokeProps} d="M12 3 19 6v5c0 4.4-2.6 7.8-7 10-4.4-2.2-7-5.6-7-10V6l7-3Z" /><path {...strokeProps} d="m9 12 2 2 4-4" /></svg>;
    case 'logout':
      return <svg {...common}><path {...strokeProps} d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>;
    case 'plus':
      return <svg {...common}><path {...strokeProps} d="M12 5v14M5 12h14" /></svg>;
    case 'search':
      return <svg {...common}><circle {...strokeProps} cx="11" cy="11" r="6" /><path {...strokeProps} d="m16 16 4 4" /></svg>;
    case 'crosshair':
      return <svg {...common}><circle {...strokeProps} cx="12" cy="12" r="7" /><path {...strokeProps} d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>;
    case 'check':
      return <svg {...common}><path {...strokeProps} d="m5 12 4 4L19 6" /></svg>;
    case 'shuffle':
      return <svg {...common}><path {...strokeProps} d="M4 7h3c3 0 4 10 7 10h2" /><path {...strokeProps} d="m16 13 4 4-4 4M4 17h3c1.4 0 2.3-1 3-2.4M14 7h2M16 3l4 4-4 4" /></svg>;
    case 'ambulance':
      return <svg {...common}><path {...strokeProps} d="M4 8h9v8H4zM13 11h4l3 3v2h-7z" /><circle cx="7" cy="17" r="1.8" fill="currentColor" /><circle cx="17" cy="17" r="1.8" fill="currentColor" /><path {...strokeProps} d="M8.5 10v4M6.5 12h4" /></svg>;
    case 'heart':
      return <svg {...common}><path {...strokeProps} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;
    case 'star':
      return <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><polygon points="12 3 14.7 8.5 20.8 9.4 16.4 13.7 17.4 19.8 12 16.9 6.6 19.8 7.6 13.7 3.2 9.4 9.3 8.5" fill="#BA7517" /></svg>;
    case 'trophy':
      return <svg {...common}><path {...strokeProps} d="M8 4h8v5a4 4 0 0 1-8 0V4ZM10 17h4M9 21h6M12 13v4M8 6H4c0 3 1.5 5 4 5M16 6h4c0 3-1.5 5-4 5" /></svg>;
    case 'lock':
      return <svg {...common}><rect {...strokeProps} x="5" y="10" width="14" height="10" rx="2" /><path {...strokeProps} d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>;
    case 'activity':
      return <svg {...common}><path {...strokeProps} d="M4 12h4l2-6 4 12 2-6h4" /></svg>;
    default:
      return null;
  }
}

export function RatingStars({ count = 5 }: { count?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <SvgIcon key={index} name="star" className="h-3 w-3" />
      ))}
    </span>
  );
}

export function StatusDot({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full bg-[var(--color-verde)] ${className}`} />;
}

export function InitialAvatar({ initials, tone = 'blue' }: { initials: string; tone?: 'blue' | 'green' | 'purple' | 'amber' }) {
  const tones = {
    blue: 'bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]',
    green: 'bg-[var(--color-verde-claro)] text-[var(--color-verde)]',
    purple: 'bg-[#EEEDFE] text-[#6153B8]',
    amber: 'bg-[#FAEEDA] text-[#9A6A18]',
  };

  return (
    <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium ${tones[tone]}`}>
      {initials}
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[var(--color-verde)]" />
    </span>
  );
}

export function MedicilioLogo() {
  return (
    <Link href="/dashboard/patient/inicio" className="flex items-center gap-3">
      <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[var(--color-azul-primario)] text-white">
        <SvgIcon name="pulse" className="h-8 w-8" />
      </span>
      <span className="leading-tight">
        <span className="block text-[18px] font-semibold text-[var(--color-azul-primario)]">Medicilio</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-verde)]">Salud a domicilio</span>
      </span>
    </Link>
  );
}

function Topbar() {
  return (
    <div className="h-[28px] bg-[var(--color-azul-oscuro)] text-xs">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
        <span className="inline-flex items-center gap-2 text-[#85B7EB]">
          <SvgIcon name="pin" className="h-3.5 w-3.5 text-[var(--color-verde)]" />
          Gran Concepción · Disponible 24/7
        </span>
        <span className="hidden items-center gap-2 text-[var(--color-azul-borde)] sm:inline-flex">
          <SvgIcon name="phone" className="h-3.5 w-3.5 text-[var(--color-verde)]" />
          +56 9 XXXX XXXX · Soporte 24/7
        </span>
      </div>
    </div>
  );
}

function PatientNavbar() {
  const { user } = useAuth();
  return (
    <nav className="h-[62px] border-b border-[var(--color-borde-card)] bg-white">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
        <MedicilioLogo />
        <div className="flex items-center gap-4">
          <button type="button" className="relative rounded-full border border-[var(--color-borde-card)] p-2 text-[var(--color-azul-primario)] hover:bg-[var(--color-azul-claro)]" aria-label="Notificaciones">
            <SvgIcon name="bell" className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-rojo-urgencia)]" />
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-borde-card)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-texto-2)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
              <SvgIcon name="user" className="h-4 w-4" />
            </span>
            {user?.firstName || 'Juan'} {user?.lastName || 'Pérez'}
          </span>
        </div>
      </div>
    </nav>
  );
}

function UrgencyBar() {
  return (
    <div className="h-auto bg-[var(--color-rojo-urgencia)] text-white md:h-[54px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between md:py-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <SvgIcon name="briefcase" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">¿Necesitas atención médica urgente ahora?</span>
            <span className="block text-xs font-normal text-white/85">Médico disponible en 15–20 min aprox. · 24 horas.</span>
          </span>
        </div>
        <Link href="/dashboard/patient/medico" className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-rojo-urgencia)] hover:bg-[var(--color-rojo-claro)]">
          <SvgIcon name="phone" className="h-4 w-4" />
          Solicitar médico urgente
        </Link>
      </div>
    </div>
  );
}

interface SidebarItem {
  href: string;
  label: string;
  icon: IconName;
  tone?: 'blue' | 'red' | 'green';
  badge?: string;
}

function SidebarLink({ item, active }: { item: SidebarItem; active: boolean }) {
  const activeClass =
    item.tone === 'red'
      ? 'border-l-[var(--color-rojo-urgencia)] bg-[#FFF0F0] text-[var(--color-rojo-urgencia)]'
      : item.tone === 'green'
        ? 'border-l-[var(--color-verde)] bg-[#F0FFF9] text-[var(--color-verde)]'
        : 'border-l-[var(--color-azul-primario)] bg-[#EBF3FF] text-[var(--color-azul-primario)]';

  return (
    <Link
      href={item.href}
      className={`flex h-9 items-center gap-3 border-l-[3px] px-4 text-[13px] font-medium ${
        active ? activeClass : 'border-l-transparent text-[var(--color-texto-3)] hover:bg-[#F3F7FB] hover:text-[var(--color-texto-2)]'
      }`}
    >
      <SvgIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          item.tone === 'red' ? 'bg-[var(--color-rojo-urgencia)] text-white' : item.tone === 'green' ? 'bg-[var(--color-verde)] text-white' : 'bg-[var(--color-azul-primario)] text-white'
        }`}>
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function PatientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const isBajaPeso = pathname.includes('/baja-peso');

  const groups: { title: string; items: SidebarItem[] }[] = [
    {
      title: 'Principal',
      items: [
        { href: '/dashboard/patient/inicio', label: 'Inicio', icon: 'home' },
        { href: '/dashboard/patient/medico', label: 'Urgencia', icon: 'briefcase', tone: 'red', badge: '!' },
        { href: '/dashboard/patient/medico/agendar', label: 'Agendar médico', icon: 'calendar' },
        { href: '/dashboard/patient/baja-peso', label: 'Baja de peso', icon: 'scale', tone: 'green', badge: 'Nuevo' },
        { href: '/dashboard/patient/examenes-domicilio', label: 'Exámenes', icon: 'flask' },
      ],
    },
    {
      title: 'Mi cuenta',
      items: [
        { href: '/dashboard/patient/consultas', label: 'Historial', icon: 'clock' },
        { href: '/dashboard/patient/resultados-examenes', label: 'Recetas', icon: 'file' },
        { href: '/dashboard/patient/resultados-examenes', label: 'Resultados', icon: 'chart' },
        { href: '/dashboard/patient/pagos', label: 'Pagos', icon: 'card' },
        { href: '/dashboard/patient/mensajes', label: 'Mensajes', icon: 'message', badge: '2' },
      ],
    },
    ...(isBajaPeso
      ? [{
          title: 'Mi programa',
          items: [
            { href: '/dashboard/patient/baja-peso#progreso', label: 'Mi progreso', icon: 'chart', tone: 'green' as const },
            { href: '/dashboard/patient/baja-peso#controles', label: 'Mis controles', icon: 'calendar', tone: 'green' as const },
            { href: '/dashboard/patient/mensajes', label: 'Mensajes', icon: 'message', badge: '2' },
          ],
        }]
      : []),
    {
      title: 'Cuenta',
      items: [
        { href: '/dashboard/patient/perfil', label: 'Mi perfil', icon: 'user' },
        { href: '/dashboard/patient/perfil', label: 'Ajustes', icon: 'settings' },
        { href: '/dashboard/patient/soporte', label: 'Soporte', icon: 'shield' },
      ],
    },
  ];

  const isActive = (href: string) => {
    const cleanHref = href.split('#')[0];
    if (cleanHref === '/dashboard/patient/medico') return pathname === cleanHref;
    if (cleanHref === '/dashboard/patient/inicio') return pathname === cleanHref;
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  return (
    <aside className="hidden w-[224px] shrink-0 border-r border-[var(--color-borde-card)] bg-white lg:flex lg:flex-col">
      <div className="flex-1 py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-2 px-4 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-texto-4)]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink key={`${group.title}-${item.label}`} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-borde-card)] p-4">
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/auth/login');
          }}
          className="flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-[13px] font-medium text-[var(--color-texto-3)] hover:bg-[#F3F7FB]"
        >
          <SvgIcon name="logout" className="h-4 w-4" />
          Salir
        </button>
      </div>
    </aside>
  );
}

export function PatientShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-fondo-pag)] text-[var(--color-texto-1)]">
      <Topbar />
      <PatientNavbar />
      <UrgencyBar />
      <div className="mx-auto flex max-w-[1440px]">
        <PatientSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[16px] border border-[var(--color-borde-card)] bg-white ${className}`}>{children}</section>;
}

export function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'red' | 'gray' }) {
  const tones = {
    blue: 'border-[var(--color-azul-borde)] bg-white text-[var(--color-azul-primario)]',
    green: 'border-[var(--color-verde-borde)] bg-[var(--color-verde-claro)] text-[#27500A]',
    red: 'border-[var(--color-rojo-borde)] bg-[var(--color-rojo-claro)] text-[var(--color-rojo-urgencia)]',
    gray: 'border-[var(--color-borde-card)] bg-white text-[var(--color-texto-3)]',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function MetricsStrip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-[var(--color-borde-card)] bg-white md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border-b border-r border-[var(--color-borde-card)] px-4 py-4 text-center last:border-r-0 md:border-b-0">
          <p className="text-2xl font-semibold text-[var(--color-azul-primario)]">{item.value}</p>
          <p className="mt-1 text-xs font-normal text-[var(--color-texto-3)]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function MockMap({ height = 160, green = false }: { height?: number; green?: boolean }) {
  const primary = green ? 'var(--color-verde)' : 'var(--color-azul-primario)';
  return (
    <div className="relative overflow-hidden rounded-[12px] bg-[var(--color-azul-claro)]" style={{ height }}>
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
        <defs>
          <pattern id={`grid-${height}-${green ? 'g' : 'b'}`} width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#B5D4F4" strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${height}-${green ? 'g' : 'b'})`} />
      </svg>
      <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-azul-borde)] bg-white/25" />
      <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white/60" />
      <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-sm" style={{ background: primary }}>
        <SvgIcon name="user" className="h-4 w-4" />
      </span>
      {[
        ['12 min', 'left-[18%] top-[25%]'],
        ['18 min', 'left-[66%] top-[24%]'],
        ['23 min', 'left-[58%] top-[70%]'],
      ].map(([label, position]) => (
        <span key={label} className={`absolute ${position}`}>
          <span className="mb-1 block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-azul-primario)] shadow-sm">{label}</span>
          <span className="mx-auto block h-7 w-7 rounded-full border-[5px] border-white bg-[var(--color-verde)] shadow-sm" />
        </span>
      ))}
    </div>
  );
}

export const defaultMetrics = [
  { value: '+3.200', label: 'Pacientes atendidos' },
  { value: '48', label: 'Profesionales activos' },
  { value: '4.9 / 5', label: 'Calificación promedio' },
  { value: '15 min', label: 'Tiempo medio llegada' },
];

export function FloatingAction({ href, children, green = false }: { href: string; children: ReactNode; green?: boolean }) {
  return (
    <Link
      href={href}
      className={`fixed bottom-6 right-6 z-[1000] hidden items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg md:inline-flex ${
        green ? 'bg-[var(--color-verde)] hover:bg-[#167F5E]' : 'bg-[var(--color-azul-primario)] hover:bg-[#0C447C]'
      }`}
    >
      <SvgIcon name={green ? 'check' : 'search'} className="h-4 w-4" />
      {children}
    </Link>
  );
}
