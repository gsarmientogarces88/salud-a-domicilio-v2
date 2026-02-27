'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
  PATIENT: '/dashboard/patient',
  DOCTOR: '/dashboard/doctor',
  ADMIN: '/dashboard/admin',
};

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
      router.push(ROLE_ROUTES[role] || '/dashboard/patient');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-center">Iniciar Sesión</h1>
        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required />
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required />
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-primary py-2 text-white hover:bg-primary-dark disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          ¿No tienes cuenta? <a href="/auth/register" className="text-primary hover:underline">Regístrate</a>
        </p>
      </form>
    </main>
  );
}
