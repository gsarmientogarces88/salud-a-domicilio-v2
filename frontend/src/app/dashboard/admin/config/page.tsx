'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminConfigRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin?tab=config');
  }, [router]);
  return <p className="text-sm text-gray-500">Redirigiendo a Configuración…</p>;
}
