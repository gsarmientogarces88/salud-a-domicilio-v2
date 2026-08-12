'use client';

import { useAuth } from '@/context/AuthContext';
import { DoctorRequestsProvider } from '@/context/DoctorRequestsContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { PatientShell } from '@/components/medicilio/MedicilioUI';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!user) return null;

  const isPatient = user.role === 'PATIENT';

  if (isPatient) {
    return (
      <DoctorRequestsProvider>
        <PatientShell>{children}</PatientShell>
      </DoctorRequestsProvider>
    );
  }

  return (
    <DoctorRequestsProvider>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-6">
            {children}
          </main>
        </div>
      </div>
    </DoctorRequestsProvider>
  );
}
