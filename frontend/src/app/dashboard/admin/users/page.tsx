'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin?tab=users');
  }, [router]);
  return <p className="text-sm text-gray-500">Redirigiendo a Usuarios…</p>;
}
