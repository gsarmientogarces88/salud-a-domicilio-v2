'use client';

import {
  calcImc,
  formatDayLong,
  imcCategory,
  type PatientFormData,
} from './agendarTypes';

const PRIMARY = '#1A7A5E';

type ConfirmacionCitaProps = {
  date: Date;
  time: string;
  form: PatientFormData;
  success: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmacionCita({
  date,
  time,
  form,
  success,
  onBack,
  onConfirm,
  onClose,
}: ConfirmacionCitaProps) {
  const imc = calcImc(Number(form.pesoKg), Number(form.alturaCm));
  const imcInfo = imc != null ? imcCategory(imc) : null;

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
          style={{ background: PRIMARY }}
        >
          ✓
        </div>
        <h2 className="text-xl font-semibold text-[#0F5240]">Cita agendada</h2>
        <p className="max-w-sm text-sm leading-6 text-[#3B6D11]">
          Tu cita fue agendada. Recibirás un correo de confirmación en{' '}
          <span className="font-semibold">{form.email}</span>.
        </p>
        <p className="text-sm text-[#0F5240]">
          {formatDayLong(date)} · {time}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-[12px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: PRIMARY }}
        >
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#0F5240]">Confirma tu cita</h2>
        <p className="mt-1 text-sm text-[#3B6D11]">Revisa el resumen antes de agendar.</p>
      </div>

      <div className="space-y-3 rounded-[12px] border border-[#CDE8DE] bg-[#E6F4F0] p-4 text-sm text-[#0F5240]">
        <div className="flex justify-between gap-3">
          <span className="text-[#3B6D11]">Fecha</span>
          <span className="font-semibold text-right">{formatDayLong(date)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#3B6D11]">Hora</span>
          <span className="font-semibold">{time}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#3B6D11]">Paciente</span>
          <span className="font-semibold text-right">{form.nombreCompleto}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#3B6D11]">IMC</span>
          <span className="font-semibold">
            {imc != null && imcInfo ? `${imc.toFixed(1)} · ${imcInfo.label}` : '—'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#3B6D11]">Email</span>
          <span className="font-semibold text-right">{form.email}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-[12px] border border-[#CDE8DE] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F5240]"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-[12px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: PRIMARY }}
        >
          Confirmar y agendar
        </button>
      </div>
    </div>
  );
}
