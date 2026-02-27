'use client';
import RoleGuard from '@/components/layout/RoleGuard';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="PATIENT">{children}</RoleGuard>;
}
