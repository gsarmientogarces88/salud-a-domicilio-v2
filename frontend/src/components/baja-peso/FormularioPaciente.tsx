'use client';

import { useMemo } from 'react';
import {
  ENFERMEDADES_OPCIONES,
  ageFromBirthDate,
  calcImc,
  formatRutInput,
  imcCategory,
  type PatientFormData,
} from './agendarTypes';

const PRIMARY = '#1A7A5E';
const MOTIVO_MAX = 300;

const inputClass =
  'h-10 w-full rounded-[10px] border border-[#CDE8DE] bg-white px-3 text-sm text-[#0F5240] outline-none placeholder:text-gray-400 focus:border-[#1A7A5E]';
const labelClass = 'mb-1 block text-xs font-medium text-[#3B6D11]';

type FormularioPacienteProps = {
  value: PatientFormData;
  onChange: (next: PatientFormData) => void;
  errors: Partial<Record<keyof PatientFormData | 'enfermedades', string>>;
  onBack: () => void;
  onSubmit: () => void;
};

export default function FormularioPaciente({
  value,
  onChange,
  errors,
  onBack,
  onSubmit,
}: FormularioPacienteProps) {
  const set = <K extends keyof PatientFormData>(key: K, v: PatientFormData[K]) => {
    onChange({ ...value, [key]: v });
  };

  const age = useMemo(() => ageFromBirthDate(value.fechaNacimiento), [value.fechaNacimiento]);
  const peso = Number(value.pesoKg);
  const altura = Number(value.alturaCm);
  const imc = useMemo(() => calcImc(peso, altura), [peso, altura]);
  const imcInfo = imc != null ? imcCategory(imc) : null;

  const imcToneClass =
    imcInfo?.tone === 'blue'
      ? 'bg-[#E8F1FB] text-[#185FA5]'
      : imcInfo?.tone === 'green'
        ? 'bg-[#E6F4F0] text-[#1A7A5E]'
        : imcInfo?.tone === 'amber'
          ? 'bg-[#FAEEDA] text-[#9A6A18]'
          : imcInfo?.tone === 'red'
            ? 'bg-[#FCEBEB] text-[#E24B4A]'
            : '';

  const toggleEnfermedad = (tag: string) => {
    const current = value.enfermedades;
    if (tag === 'Ninguna') {
      set('enfermedades', current.includes('Ninguna') ? [] : ['Ninguna']);
      return;
    }
    let next = current.filter((t) => t !== 'Ninguna');
    if (next.includes(tag)) next = next.filter((t) => t !== tag);
    else next = [...next, tag];
    if (tag !== 'Otra' && !next.includes('Otra')) {
      // keep enfermedadOtra only if Otra selected — cleared when removing Otra below
    }
    if (!next.includes('Otra')) {
      onChange({ ...value, enfermedades: next, enfermedadOtra: '' });
      return;
    }
    set('enfermedades', next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#0F5240]">Tus datos — para que el médico se prepare</h2>
        <p className="mt-1 text-sm text-[#3B6D11]">Completa los campos requeridos antes de confirmar.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className={labelClass}>
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={value.nombreCompleto}
            onChange={(e) => set('nombreCompleto', e.target.value)}
            autoComplete="name"
          />
          {errors.nombreCompleto && <p className="mt-1 text-xs text-red-600">{errors.nombreCompleto}</p>}
        </div>
        <div>
          <label className={labelClass}>
            RUT <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={value.rut}
            onChange={(e) => set('rut', formatRutInput(e.target.value))}
            placeholder="12.345.678-9"
            inputMode="text"
          />
          {errors.rut && <p className="mt-1 text-xs text-red-600">{errors.rut}</p>}
        </div>
        <div>
          <label className={labelClass}>
            Fecha de nacimiento <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={value.fechaNacimiento}
            onChange={(e) => set('fechaNacimiento', e.target.value)}
          />
          {errors.fechaNacimiento && <p className="mt-1 text-xs text-red-600">{errors.fechaNacimiento}</p>}
        </div>
        <div>
          <label className={labelClass}>Edad</label>
          <input
            className={`${inputClass} bg-[#F7FBF0]`}
            value={age != null ? `${age} años` : '—'}
            readOnly
          />
        </div>
        <div>
          <label className={labelClass}>
            Sexo <span className="text-red-500">*</span>
          </label>
          <select
            className={inputClass}
            value={value.sexo}
            onChange={(e) => set('sexo', e.target.value as PatientFormData['sexo'])}
          >
            <option value="">Selecciona</option>
            <option value="Femenino">Femenino</option>
            <option value="Masculino">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
          {errors.sexo && <p className="mt-1 text-xs text-red-600">{errors.sexo}</p>}
        </div>
        <div>
          <label className={labelClass}>
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            className={inputClass}
            value={value.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
          />
          {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className={inputClass}
            value={value.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
      </div>

      <div className="border-t border-[#CDE8DE] pt-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#3B6D11]">
          Datos clínicos
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>
              Peso actual (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={30}
              max={300}
              step={0.1}
              className={inputClass}
              value={value.pesoKg}
              onChange={(e) => set('pesoKg', e.target.value)}
            />
            {errors.pesoKg && <p className="mt-1 text-xs text-red-600">{errors.pesoKg}</p>}
          </div>
          <div>
            <label className={labelClass}>
              Altura (cm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={100}
              max={250}
              className={inputClass}
              value={value.alturaCm}
              onChange={(e) => set('alturaCm', e.target.value)}
            />
            {errors.alturaCm && <p className="mt-1 text-xs text-red-600">{errors.alturaCm}</p>}
          </div>
          <div>
            <label className={labelClass}>IMC</label>
            {imc != null && imcInfo ? (
              <div
                className={`flex h-10 items-center justify-center rounded-[10px] px-2 text-sm font-semibold ${imcToneClass}`}
              >
                {imc.toFixed(1)} · {imcInfo.label}
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-[10px] border border-dashed border-[#CDE8DE] px-3 text-xs text-gray-400">
                Completa peso y altura
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <label className={labelClass}>
            Objetivo de peso (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={30}
            max={300}
            step={0.1}
            className={inputClass}
            value={value.objetivoKg}
            onChange={(e) => set('objetivoKg', e.target.value)}
          />
          {errors.objetivoKg && <p className="mt-1 text-xs text-red-600">{errors.objetivoKg}</p>}
        </div>

        <div className="mt-3">
          <label className={labelClass}>
            Motivo de consulta <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            maxLength={MOTIVO_MAX}
            className="w-full rounded-[10px] border border-[#CDE8DE] bg-white px-3 py-2 text-sm text-[#0F5240] outline-none focus:border-[#1A7A5E]"
            value={value.motivo}
            onChange={(e) => set('motivo', e.target.value)}
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-400">
            <span>{errors.motivo && <span className="text-red-600">{errors.motivo}</span>}</span>
            <span>
              {value.motivo.length}/{MOTIVO_MAX}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <p className={labelClass}>
            Enfermedades previas <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ENFERMEDADES_OPCIONES.map((tag) => {
              const active = value.enfermedades.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleEnfermedad(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'text-white' : 'border border-[#CDE8DE] bg-white text-[#0F5240]'
                  }`}
                  style={active ? { background: PRIMARY } : undefined}
                >
                  {tag === 'Otra' ? '+ Otra' : tag}
                </button>
              );
            })}
          </div>
          {value.enfermedades.includes('Otra') && (
            <input
              className={`${inputClass} mt-2`}
              placeholder="Especifica otra enfermedad"
              value={value.enfermedadOtra}
              onChange={(e) => set('enfermedadOtra', e.target.value)}
            />
          )}
          {errors.enfermedades && <p className="mt-1 text-xs text-red-600">{errors.enfermedades}</p>}
        </div>

        <div className="mt-3">
          <label className={labelClass}>Medicamentos actuales (opcional)</label>
          <textarea
            rows={2}
            className="w-full rounded-[10px] border border-[#CDE8DE] bg-white px-3 py-2 text-sm text-[#0F5240] outline-none focus:border-[#1A7A5E]"
            value={value.medicamentos}
            onChange={(e) => set('medicamentos', e.target.value)}
            placeholder="Ej: metformina, levotiroxina…"
          />
        </div>

        <div className="mt-3">
          <label className={labelClass}>Alergias conocidas (opcional)</label>
          <input
            className={inputClass}
            value={value.alergias}
            onChange={(e) => set('alergias', e.target.value)}
            placeholder="Ej: penicilina"
          />
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
          onClick={onSubmit}
          className="rounded-[12px] px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: PRIMARY }}
        >
          Confirmar cita →
        </button>
      </div>
    </div>
  );
}
