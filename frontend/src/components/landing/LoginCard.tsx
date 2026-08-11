'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LANDING_ROUTES, whatsappUrl } from '@/lib/landingConfig';

const ROLE_ROUTES: Record<string, string> = {
  PATIENT: '/dashboard/patient/inicio',
  DOCTOR: '/dashboard/doctor',
  ADMIN: '/dashboard/admin',
  LABORATORY: '/dashboard/laboratorio',
};

type Tab = 'login' | 'register';

type LoginCardProps = {
  redirectTo?: string;
};

export default function LoginCard({ redirectTo }: LoginCardProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (remember) {
        localStorage.setItem('medicilio_remember_email', email);
      } else {
        localStorage.removeItem('medicilio_remember_email');
      }
      const stored = localStorage.getItem('user');
      const role = stored ? (JSON.parse(stored) as { role?: string }).role : 'PATIENT';
      const fallback = ROLE_ROUTES[role || 'PATIENT'] || '/dashboard/patient/inicio';
      router.push(redirectTo || fallback);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-[0_20px_50px_-20px_rgba(24,95,165,0.35)] sm:p-7">
      <div className="mb-5 flex border-b border-[#E5EAF0]">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={`flex-1 pb-3 text-sm font-semibold transition ${
            tab === 'login'
              ? 'border-b-2 border-[#185FA5] text-[#185FA5]'
              : 'border-b-2 border-transparent text-[#6B7280] hover:text-[#374151]'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`flex-1 pb-3 text-sm font-semibold transition ${
            tab === 'register'
              ? 'border-b-2 border-[#185FA5] text-[#185FA5]'
              : 'border-b-2 border-transparent text-[#6B7280] hover:text-[#374151]'
          }`}
        >
          Registrarte
        </button>
      </div>

      {tab === 'register' ? (
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-[#4B5563]">
            Crea tu cuenta gratis en menos de un minuto y agenda atención médica a domicilio.
          </p>
          <Link
            href={LANDING_ROUTES.register}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#185FA5]/20 transition hover:bg-[#144E8A]"
          >
            Ir al registro
          </Link>
          <p className="text-xs text-[#6B7280]">
            ¿Ya tienes cuenta?{' '}
            <button type="button" className="font-semibold text-[#185FA5]" onClick={() => setTab('login')}>
              Inicia sesión
            </button>
          </p>
        </div>
      ) : (
        <>
          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">{error}</p>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="landing-email" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Correo electrónico
              </label>
              <input
                id="landing-email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFB] px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#185FA5] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/15"
                required
              />
            </div>
            <div>
              <label htmlFor="landing-password" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Contraseña
              </label>
              <input
                id="landing-password"
                type="password"
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFB] px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#185FA5] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/15"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#4B5563]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#185FA5] focus:ring-[#185FA5]"
                />
                Recordarme
              </label>
              <Link href={LANDING_ROUTES.login} className="font-medium text-[#185FA5] hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#185FA5]/25 transition hover:bg-[#144E8A] disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar a mi cuenta'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E5EAF0]" />
            <span className="text-xs text-[#9CA3AF]">o continúa con</span>
            <span className="h-px flex-1 bg-[#E5EAF0]" />
          </div>

          <a
            href={whatsappUrl('Hola Medicilio, quiero acceso rápido por WhatsApp')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/12 px-4 py-3 text-sm font-semibold text-[#128C7E] ring-1 ring-[#25D366]/40 transition hover:bg-[#25D366]/20"
          >
            <WhatsAppIcon />
            Consultas o dudas por WhatsApp
          </a>

          <p className="mt-5 text-center text-sm text-[#6B7280]">
            ¿No tienes cuenta?{' '}
            <Link href={LANDING_ROUTES.register} className="font-semibold text-[#185FA5] hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.3c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.6.9-.8 1-.1.1-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.9-.1-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 2.6 1.1 2.6.7 3.1.7.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1 0-.3-.1-.6-.2z" />
      <path d="M12 2a10 10 0 0 0-8.7 15l-1.1 4 4.1-1.1A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-2.5.7.7-2.4-.2-.3a8.2 8.2 0 1 1 6.5 3.3z" />
    </svg>
  );
}
