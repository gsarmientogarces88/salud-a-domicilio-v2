'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.role === role) return;

    const redirectTo = role === 'LABORATORY' ? '/auth/laboratorio/login' : '/auth/login';
    router.push(redirectTo);
  }, [user, loading, role, router]);

  if (loading || user?.role !== role) return null;
  return <>{children}</>;
}
