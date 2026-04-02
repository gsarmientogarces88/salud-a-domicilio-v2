'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LaboratorioLoginPage() {
  const { loginLaboratory } = useAuth();
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
      await loginLaboratory(email, password);
      router.push('/dashboard/laboratorio');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <header className="border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-teal-900">
            <span className="text-2xl">🧪</span>
            <span className="text-sm font-semibold">Laboratorios — Salud a Domicilio</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-teal-700">
            Acceso pacientes / médicos
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-teal-100 bg-white p-8 shadow-xl shadow-teal-900/5 ring-1 ring-teal-50">
          <h1 className="text-2xl font-bold text-gray-900">Ingreso laboratorio</h1>
          <p className="mt-2 text-sm text-gray-600">
            Panel privado para gestionar solicitudes de exámenes a domicilio.
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Correo</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Contraseña</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Ingresando…' : 'Entrar al panel'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
