'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import DateRangePicker from './DateRangePicker';
import TimeSlots from './TimeSlots';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
}

export default function ScheduleModal({ isOpen, onClose, doctor }: ScheduleModalProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  useEffect(() => {
    // limpiar al abrir/cerrar o cambiar doctor
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setSlotsError('');
  }, [isOpen, doctor]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!doctor || !selectedDate) return;
      setLoadingSlots(true);
      setSlotsError('');
      try {
        const dateParam = selectedDate.toISOString().split('T')[0];
        const res = await apiFetch<{ data: { slots: string[] } }>(
          `/professionals/${doctor.id}/availability?date=${dateParam}`,
        );
        setAvailableSlots(res.data.slots || []);
      } catch (e: any) {
        setSlotsError(e.message || 'No se pudieron cargar los horarios disponibles.');
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [doctor, selectedDate]);

  const handleConfirm = () => {
    if (!doctor || !selectedDate || !selectedTime) return;
    onClose();
    const fecha = selectedDate.toISOString().split('T')[0];
    router.push(`/dashboard/patient/medico/agendar/pago?doctor=${doctor.id}&fecha=${fecha}&hora=${selectedTime}`);
  };

  const canConfirm = doctor && selectedDate && selectedTime;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">Seleccionar Fecha y Hora</h3>
        {doctor && (
          <p className="mb-6 text-sm text-gray-600">
            {doctor.name} · {doctor.specialty}
          </p>
        )}

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Fecha</label>
            <DateRangePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Hora</label>
            <TimeSlots
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
              occupied={[]}
              slots={availableSlots}
            />
            {loadingSlots && (
              <p className="mt-2 text-xs text-gray-500">Cargando horarios disponibles...</p>
            )}
            {!loadingSlots && selectedDate && availableSlots.length === 0 && !slotsError && (
              <p className="mt-2 text-xs text-gray-500">
                No hay horas disponibles para este día. Prueba con otra fecha.
              </p>
            )}
            {slotsError && <p className="mt-2 text-xs text-red-600">{slotsError}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 rounded-lg px-4 py-2 font-medium text-white ${
              canConfirm
                ? 'bg-green-500 hover:bg-green-600'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            Confirmar horario
          </button>
        </div>
      </div>
    </div>
  );
}
