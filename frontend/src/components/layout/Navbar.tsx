'use client';

import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/brand/BrandLogo';

const HOME_BY_ROLE: Record<string, string> = {
  PATIENT: '/dashboard/patient/inicio',
  DOCTOR: '/dashboard/doctor',
  ADMIN: '/dashboard/admin',
  LABORATORY: '/dashboard/laboratorio',
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className="flex items-center justify-between border-b bg-white px-6 py-3">
      <BrandLogo href={HOME_BY_ROLE[user?.role || 'DOCTOR'] || '/dashboard/doctor'} size={36} />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.firstName} ({user?.role})</span>
        <button onClick={handleLogout} className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600">
          Salir
        </button>
      </div>
    </nav>
  );
}
