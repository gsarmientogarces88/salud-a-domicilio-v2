'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminServicesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin?tab=services');
  }, [router]);
  return <p className="text-sm text-gray-500">Redirigiendo a Servicios…</p>;
}
