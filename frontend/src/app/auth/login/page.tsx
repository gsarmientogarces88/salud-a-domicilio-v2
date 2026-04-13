'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
  PATIENT: '/dashboard/patient/inicio',
  DOCTOR: '/dashboard/doctor',
  ADMIN: '/dashboard/admin',
  LABORATORY: '/dashboard/laboratorio',
};

const SYMPTOMS = [
  '🔥 Fiebre',
  '🤧 Resfrío / Gripe',
  '🫁 Problemas respiratorios',
  '🤕 Dolor de cabeza',
  '🤢 Náuseas / vómitos',
  '💩 Diarrea',
  '🤒 Dolor abdominal',
  '🧒 Atención infantil',
  '👴 Atención tercera edad',
  '➕ Otros síntomas (etc.)',
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem('user');
      const role = stored ? JSON.parse(stored).role : 'PATIENT';
      router.push(ROLE_ROUTES[role] || '/dashboard/patient/inicio');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-salud-light via-white to-white">
      {/* Barra superior similar a landing */}
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-xl">
              🏥
            </div>
            <span className="text-sm font-semibold text-sky-800 sm:text-base">
              Salud a Domicilio
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-gray-600 sm:inline">¿Eres nuevo?</span>
            <a
              href="/auth/login"
              className="rounded-full px-3 py-1 text-gray-600 hover:bg-sky-50"
            >
              Iniciar Sesión
            </a>
            <a
              href="/auth/register"
              className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 font-medium text-sky-700 hover:bg-sky-100"
            >
              Registrarse
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col items-center justify-center px-4 py-10 lg:flex-row lg:gap-12">
        {/* Columna izquierda: hero e información */}
        <section className="mb-10 w-full max-w-xl lg:mb-0 lg:flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm ring-1 ring-sky-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Plataforma de salud digital
          </div>
          <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            Médicos a Domicilio para todo Chile
          </h1>
          <p className="mb-6 max-w-lg text-sm text-gray-600 sm:text-base">
            Atención médica segura, rápida y profesional sin salir de tu casa. Agenda tu consulta y recibe a un
            médico en tu domicilio con seguimiento digital.
          </p>

          {/* Botones de acción tipo hero */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
            >
              <span>Agendar Atención</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-md ring-1 ring-sky-100 hover:bg-sky-50"
            >
              <span className="text-lg">🟢</span>
              <span>Dudas por WhatsApp</span>
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-3 text-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-gray-700 shadow-sm ring-1 ring-sky-100">
              <span className="text-lg">🏥</span>
              <span>Equipo médico certificado</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-gray-700 shadow-sm ring-1 ring-emerald-100">
              <span className="text-lg">🔒</span>
              <span>Datos protegidos y confidenciales</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 p-5 shadow-md ring-1 ring-sky-100 backdrop-blur">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              Síntomas que atienden nuestros médicos
            </h2>
            <p className="mb-4 text-xs text-gray-600 sm:text-sm">
              Nuestros médicos pueden evaluar en tu domicilio síntomas frecuentes y urgencias leves.
            </p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900 ring-1 ring-sky-100 sm:text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Columna derecha: tarjeta de login */}
        <section className="w-full max-w-md lg:flex-1">
          <div className="rounded-3xl bg-white/95 p-8 shadow-2xl ring-1 ring-sky-100 backdrop-blur">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                🏥
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Ingresa a tu cuenta</h2>
              <p className="mt-1 text-sm text-gray-500">
                Accede a tu historial, solicitudes y seguimiento médico.
              </p>
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="tu@email.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-60"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-gray-500 sm:text-sm">
              ¿No tienes cuenta?{' '}
              <a href="/auth/register" className="font-medium text-primary hover:underline">
                Regístrate
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
