'use client';

import RoleGuard from '@/components/layout/RoleGuard';

export default function LaboratorioLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="LABORATORY">{children}</RoleGuard>;
}
