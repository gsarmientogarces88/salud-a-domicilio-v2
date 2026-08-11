'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatRut, isValidRut } from '@/lib/rut';
import { getPasswordStrength } from '@/lib/passwordStrength';
import { LANDING_ROUTES } from '@/lib/landingConfig';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    rut: '',
    dateOfBirth: '',
    role: 'PATIENT',
    specialty: '',
    licenseNumber: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const toneClass =
    strength.tone === 'green'
      ? 'bg-emerald-500'
      : strength.tone === 'orange'
        ? 'bg-amber-500'
        : strength.tone === 'red'
          ? 'bg-red-500'
          : 'bg-gray-300';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.role === 'PATIENT') {
      if (!isValidRut(form.rut)) {
        setError('Ingresa un RUT chileno válido');
        return;
      }
      if (!form.dateOfBirth) {
        setError('La fecha de nacimiento es obligatoria');
        return;
      }
    }
    if (!acceptTerms) {
      setError('Debes aceptar los términos y la política de privacidad');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const phone = form.phone.trim()
        ? form.phone.trim().startsWith('+')
          ? form.phone.trim()
          : `+56${form.phone.replace(/\D/g, '').replace(/^56/, '')}`
        : undefined;

      await register({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone,
        role: form.role,
        rut: form.role === 'PATIENT' ? form.rut : undefined,
        dateOfBirth: form.role === 'PATIENT' ? form.dateOfBirth : undefined,
        specialty: form.role === 'DOCTOR' ? form.specialty || 'General' : undefined,
        licenseNumber: form.role === 'DOCTOR' ? form.licenseNumber : undefined,
      });
      router.push(form.role === 'DOCTOR' ? '/dashboard/doctor/verificacion' : '/dashboard/patient/inicio');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-sky-100">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Médicos a domicilio · Medicilio</p>
        {error && <p className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(['PATIENT', 'DOCTOR'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => set('role', role)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                form.role === role
                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {role === 'PATIENT' ? 'Paciente' : 'Médico'}
            </button>
          ))}
        </div>

        <input
          placeholder="Nombre"
          value={form.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
          required
        />
        <input
          placeholder="Apellido"
          value={form.lastName}
          onChange={(e) => set('lastName', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
          required
        />

        {form.role === 'PATIENT' && (
          <>
            <input
              placeholder="RUT (12.345.678-9)"
              value={form.rut}
              onChange={(e) => set('rut', formatRut(e.target.value))}
              className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
              required
            />
            <label className="mb-1 block text-xs font-medium text-gray-600">Fecha de nacimiento</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
              required
            />
          </>
        )}

        {form.role === 'DOCTOR' && (
          <>
            <input
              placeholder="Especialidad"
              value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
            />
            <input
              placeholder="N° de cédula profesional / licencia"
              value={form.licenseNumber}
              onChange={(e) => set('licenseNumber', e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
            />
          </>
        )}

        <div className="mb-3 flex overflow-hidden rounded-lg border focus-within:border-sky-500">
          <span className="flex items-center bg-gray-50 px-3 text-sm text-gray-500">+56</span>
          <input
            type="tel"
            placeholder="9 1234 5678"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full px-3 py-2 outline-none"
          />
        </div>

        <input
          type="password"
          placeholder="Contraseña (mín. 6)"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          className="mb-2 w-full rounded-lg border px-4 py-2 focus:border-sky-500 focus:outline-none"
          required
          minLength={6}
        />
        <div className="mb-4">
          <div className="mb-1 flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? toneClass : 'bg-gray-200'}`}
              />
            ))}
          </div>
          {strength.label ? (
            <p className="text-xs text-gray-500">
              Fortaleza: <span className="font-medium">{strength.label}</span>
            </p>
          ) : null}
        </div>

        <label className="mb-5 flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            Acepto los{' '}
            <Link href={LANDING_ROUTES.terms} className="font-medium text-sky-700 underline" target="_blank">
              Términos
            </Link>{' '}
            y la{' '}
            <Link href={LANDING_ROUTES.privacy} className="font-medium text-sky-700 underline" target="_blank">
              Política de privacidad
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-sky-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
