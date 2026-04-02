'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const DOCTORS: Record<string, { name: string; specialty: string }> = {
  '1': { name: 'Dr. Carlos Sánchez', specialty: 'Medicina General, Urgencias' },
  '2': { name: 'Dra. Laura Gómez', specialty: 'Pediatra' },
  '3': { name: 'Dr. Javier Torres', specialty: 'Cardiología' },
};

function PagoContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const doctorId = searchParams.get('doctor') || '';
  const fecha = searchParams.get('fecha') || '';
  const hora = searchParams.get('hora') || '';

  const [paymentMethod, setPaymentMethod] = useState<'isapre' | 'online'>('isapre');
  const [file, setFile] = useState<File | null>(null);

  const doctor = DOCTORS[doctorId];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Confirmar y Pagar</h1>
          <p className="text-gray-600">Resumen de tu consulta agendada</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-sky-200 text-center leading-10 text-sky-700">
            👤
          </span>
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-900">Resumen</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Médico:</strong> {doctor?.name || '-'}</p>
          <p><strong>Especialidad:</strong> {doctor?.specialty || '-'}</p>
          <p><strong>Fecha:</strong> {fecha}</p>
          <p><strong>Hora:</strong> {hora}</p>
        </div>

        {/* Opción de pago */}
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Método de pago</h3>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-sky-300">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'isapre'}
              onChange={() => setPaymentMethod('isapre')}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-gray-900">Subir Bono ISAPRE</p>
              <input
                type="file"
                accept="image/*,.pdf"
                className="mt-2 text-sm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={paymentMethod !== 'isapre'}
              />
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-sky-300">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-gray-900">Pagar en línea</p>
              <p className="text-sm text-gray-600">Tarjeta de crédito o débito</p>
            </div>
          </label>
        </div>

        {/* Contador opcional */}
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⏱️ Tienes 15 minutos para completar el pago y confirmar tu cita.
        </div>

        <button className="mt-6 w-full rounded-xl bg-green-500 py-3 font-semibold text-white hover:bg-green-600">
          Confirmar pago
        </button>
      </div>
    </div>
  );
}

export default function PagoPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando...</div>}>
      <PagoContent />
    </Suspense>
  );
}
