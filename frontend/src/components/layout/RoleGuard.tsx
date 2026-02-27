'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== role) router.push('/auth/login');
  }, [user, loading, role, router]);

  if (loading || user?.role !== role) return null;
  return <>{children}</>;
}
