'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchPatientProfile, updatePatientProfile } from '@/lib/patientProfileApi';

type EditSection = 'personal' | null;

export default function PerfilPage() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<EditSection>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<EditSection>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await fetchPatientProfile();
      const u = data.user;
      setFirstName(u.firstName);
      setLastName(u.lastName);
      setEmail(u.email);
      setPhone(u.phone || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(''), 4500);
  };

  const savePersonal = async () => {
    setSavingSection('personal');
    setError('');
    try {
      await updatePatientProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
      });
      showSuccess('Guardado correctamente.');
      setEditing(null);
      await refreshUser();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSavingSection(null);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    void load();
  };

  const inputClass =
    'mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';
  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-600';
  const readRowClass =
    'grid gap-1 border-b border-gray-100 py-3 last:border-0 sm:grid-cols-[minmax(0,0.35fr)_1fr] sm:items-center';
  const readLabelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500';
  const readValueClass = 'text-sm text-gray-900';

  const btnPrimary =
    'rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60';
  const btnSecondary =
    'rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50';
  const btnEdit =
    'shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100';

  if (loading) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-10 text-center text-gray-600">
        Cargando perfil…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Completa tu perfil para una atención más rápida y segura.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-sky-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Datos personales</h2>
            <p className="mt-1 text-xs text-gray-500">Nombre, apellido y contacto</p>
          </div>
          {editing !== 'personal' && (
            <button type="button" className={btnEdit} onClick={() => setEditing('personal')}>
              Editar
            </button>
          )}
        </div>

        {editing === 'personal' ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nombre</label>
                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Apellido</label>
                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9..."
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" className={btnSecondary} onClick={cancelEdit} disabled={savingSection === 'personal'}>
                Cancelar
              </button>
              <button type="button" className={btnPrimary} onClick={() => void savePersonal()} disabled={savingSection === 'personal'}>
                {savingSection === 'personal' ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className={readRowClass}>
              <span className={readLabelClass}>Nombre</span>
              <span className={readValueClass}>{firstName.trim() || '—'}</span>
            </div>
            <div className={readRowClass}>
              <span className={readLabelClass}>Apellido</span>
              <span className={readValueClass}>{lastName.trim() || '—'}</span>
            </div>
            <div className={readRowClass}>
              <span className={readLabelClass}>Teléfono</span>
              <span className={readValueClass}>{phone.trim() || '—'}</span>
            </div>
            <div className={readRowClass}>
              <span className={readLabelClass}>Email</span>
              <span className={readValueClass}>{email.trim() || '—'}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
