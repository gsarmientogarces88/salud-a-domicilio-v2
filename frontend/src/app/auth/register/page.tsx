'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'PATIENT' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-center">Registro</h1>
        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <input placeholder="Nombre" value={form.firstName} onChange={e => set('firstName', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required />
        <input placeholder="Apellido" value={form.lastName} onChange={e => set('lastName', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required />
        <input type="email" placeholder="Email" value={form.email} onChange={e => set('email', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required />
        <input type="password" placeholder="Contraseña (mín 6)" value={form.password} onChange={e => set('password', e.target.value)}
          className="mb-3 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none" required minLength={6} />
        <select value={form.role} onChange={e => set('role', e.target.value)}
          className="mb-6 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none">
          <option value="PATIENT">Paciente</option>
          <option value="DOCTOR">Médico</option>
        </select>
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-primary py-2 text-white hover:bg-primary-dark disabled:opacity-50">
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <a href="/auth/login" className="text-primary hover:underline">Inicia sesión</a>
        </p>
      </form>
    </main>
  );
}
