'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <nav className="flex items-center justify-between border-b bg-white px-6 py-3">
      <span className="text-lg font-bold text-primary">🏥 Salud a Domicilio</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.firstName} ({user?.role})</span>
        <button onClick={handleLogout} className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600">
          Salir
        </button>
      </div>
    </nav>
  );
}
