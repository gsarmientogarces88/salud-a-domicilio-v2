'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const LINKS: Record<string, { href: string; label: string }[]> = {
  PATIENT: [
    { href: '/dashboard/patient', label: '📋 Dashboard' },
  ],
  DOCTOR: [
    { href: '/dashboard/doctor', label: '📋 Solicitudes' },
    { href: '/dashboard/doctor/earnings', label: '💰 Ingresos' },
  ],
  ADMIN: [
    { href: '/dashboard/admin', label: '📊 Dashboard' },
    { href: '/dashboard/admin/users', label: '👥 Usuarios' },
    { href: '/dashboard/admin/services', label: '🩺 Servicios' },
    { href: '/dashboard/admin/config', label: '⚙️ Configuración' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = LINKS[user?.role || 'PATIENT'] || [];

  return (
    <aside className="w-56 border-r bg-white p-4">
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50 hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
