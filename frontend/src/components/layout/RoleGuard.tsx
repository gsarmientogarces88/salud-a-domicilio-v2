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

    if (!user) {
      if (role === 'LABORATORY') {
        router.push('/auth/laboratorio/login');
      } else if (role === 'PATIENT') {
        router.push('/');
      } else {
        router.push('/auth/login');
      }
      return;
    }

    router.push('/auth/login');
  }, [user, loading, role, router]);

  if (loading || user?.role !== role) return null;
  return <>{children}</>;
}
