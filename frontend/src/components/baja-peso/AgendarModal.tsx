'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import CalendarioHoras from './CalendarioHoras';
import FormularioPaciente from './FormularioPaciente';
import ConfirmacionCita from './ConfirmacionCita';
import {
  EMPTY_PATIENT_FORM,
  ageFromBirthDate,
  calcImc,
  isValidRut,
  type PatientFormData,
} from './agendarTypes';

type Step = 1 | 2 | 3;

type AgendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AgendarModal({ isOpen, onClose }: AgendarModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<PatientFormData>(EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData | 'enfermedades', string>>>({});
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setForm(EMPTY_PATIENT_FORM);
    setErrors({});
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reset();
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen || !user) return;
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    setForm((prev) => ({
      ...prev,
      nombreCompleto: prev.nombreCompleto || fullName,
      email: prev.email || user.email || '',
      telefono: prev.telefono || user.phone || '',
    }));
  }, [isOpen, user]);

  const hasProgress = useMemo(() => {
    if (selectedDate || selectedTime) return true;
    if (success) return false;
    return Object.entries(form).some(([key, val]) => {
      if (key === 'enfermedades') return Array.isArray(val) && val.length > 0;
      return typeof val === 'string' && val.trim().length > 0;
    });
  }, [form, selectedDate, selectedTime, success]);

  const requestClose = () => {
    if (success) {
      reset();
      onClose();
      return;
    }
    if (hasProgress) {
      const ok = window.confirm('¿Seguro que quieres salir? Perderás los datos ingresados');
      if (!ok) return;
    }
    reset();
    onClose();
  };

  const validateForm = (): boolean => {
    const e: Partial<Record<keyof PatientFormData | 'enfermedades', string>> = {};
    if (!form.nombreCompleto.trim()) e.nombreCompleto = 'Nombre requerido';
    if (!form.rut.trim()) e.rut = 'RUT requerido';
    else if (!isValidRut(form.rut)) e.rut = 'RUT inválido';
    if (!form.fechaNacimiento) e.fechaNacimiento = 'Fecha de nacimiento requerida';
    else if (ageFromBirthDate(form.fechaNacimiento) == null) e.fechaNacimiento = 'Fecha inválida';
    if (!form.sexo) e.sexo = 'Sexo requerido';
    if (!form.telefono.trim()) e.telefono = 'Teléfono requerido';
    if (!form.email.trim()) e.email = 'Email requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Email inválido';

    const peso = Number(form.pesoKg);
    const altura = Number(form.alturaCm);
    const objetivo = Number(form.objetivoKg);
    if (!form.pesoKg || !Number.isFinite(peso) || peso < 30 || peso > 300) e.pesoKg = 'Peso inválido';
    if (!form.alturaCm || !Number.isFinite(altura) || altura < 100 || altura > 250) {
      e.alturaCm = 'Altura inválida';
    }
    if (!form.objetivoKg || !Number.isFinite(objetivo) || objetivo < 30 || objetivo > 300) {
      e.objetivoKg = 'Objetivo inválido';
    } else if (Number.isFinite(peso) && objetivo >= peso) {
      e.objetivoKg = 'Debe ser menor al peso actual';
    }
    if (!form.motivo.trim()) e.motivo = 'Motivo requerido';
    if (form.enfermedades.length === 0) e.enfermedades = 'Selecciona al menos una opción';
    if (form.enfermedades.includes('Otra') && !form.enfermedadOtra.trim()) {
      e.enfermedades = 'Especifica la otra enfermedad';
    }
    if (calcImc(peso, altura) == null && !e.pesoKg && !e.alturaCm) {
      e.pesoKg = 'Completa peso y altura';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Cerrar overlay"
        className="absolute inset-0 bg-black/40"
        onClick={requestClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="baja-peso-agendar-title"
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl sm:max-w-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#CDE8DE] px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#3B6D11]">
              Baja de peso · Telemedicina
            </p>
            <h1 id="baja-peso-agendar-title" className="mt-1 text-lg font-semibold text-[#0F5240]">
              Agendar consulta
            </h1>
            {!success && (
              <p className="mt-1 text-xs text-[#3B6D11]">Paso {step} de 3</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-[8px] px-2 py-1 text-lg leading-none text-[#3B6D11] hover:bg-[#E6F4F0]"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <CalendarioHoras
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedTime(null);
              }}
              onSelectTime={setSelectedTime}
              onContinue={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <FormularioPaciente
              value={form}
              onChange={setForm}
              errors={errors}
              onBack={() => setStep(1)}
              onSubmit={() => {
                if (!validateForm()) return;
                setStep(3);
              }}
            />
          )}
          {step === 3 && selectedDate && selectedTime && (
            <ConfirmacionCita
              date={selectedDate}
              time={selectedTime}
              form={form}
              success={success}
              onBack={() => setStep(2)}
              onConfirm={() => setSuccess(true)}
              onClose={() => {
                reset();
                onClose();
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
