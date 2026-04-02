'use client';

import { useAuth } from '@/context/AuthContext';

export default function PerfilPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Perfil</h1>
      <div className="rounded-xl border bg-white p-6">
        <p className="text-gray-600">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>
    </div>
  );
}
