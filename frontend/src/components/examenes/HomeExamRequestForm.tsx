'use client';

import { useState, useRef, useEffect } from 'react';
import { chileLocations } from '@/data/chileLocations';
import { createPatientLabExam, fetchPublicLaboratories } from '@/lib/labExamsApi';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_MB = 10;

const allCommunes = chileLocations.flatMap((r) =>
  r.cities.flatMap((c) => c.communes.map((com) => ({ commune: com, region: r.region, city: c.city }))),
);

export interface HomeExamRequestFormProps {
  patientId: string;
  patientName: string;
  onSuccess?: (requestId: string) => void;
}

export default function HomeExamRequestForm({ patientName, onSuccess }: HomeExamRequestFormProps) {
  const [labs, setLabs] = useState<{ id: string; name: string; commune: string | null }[]>([]);
  const [laboratoryId, setLaboratoryId] = useState('');
  const [examRequested, setExamRequested] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [comuna, setComuna] = useState('');
  const [comments, setComments] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPublicLaboratories()
      .then((res) => setLabs(res.data))
      .catch(() => setError('No se pudo cargar la lista de laboratorios.'));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    const ext = f.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!ext || !allowed.includes(ext)) {
      setError('Formato no permitido. Usa PDF, JPG o PNG.');
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`El archivo no debe superar ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!laboratoryId) {
      setError('Selecciona un laboratorio.');
      return;
    }
    if (!examRequested.trim()) {
      setError('Describe los exámenes solicitados.');
      return;
    }
    if (!address.trim()) {
      setError('Ingresa tu dirección.');
      return;
    }
    if (!phone.trim()) {
      setError('Ingresa tu número de teléfono.');
      return;
    }
    if (!comuna) {
      setError('Selecciona tu comuna.');
      return;
    }
    if (!file) {
      setError('Debes subir tu orden médica (PDF, JPG o PNG).');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('orderFile', file);
      form.append('laboratoryId', laboratoryId);
      form.append('patientName', patientName);
      form.append('examRequested', examRequested.trim());
      form.append('address', address.trim());
      form.append('commune', comuna);
      form.append('phone', phone.trim());
      if (comments.trim()) form.append('observationsPatient', comments.trim());
      if (preferredTime.trim()) form.append('preferredTime', preferredTime.trim());

      const res = await createPatientLabExam(form);
      setAddress('');
      setPhone('');
      setComuna('');
      setFile(null);
      setComments('');
      setPreferredTime('');
      setExamRequested('');
      setLaboratoryId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.(res.data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Enviar solicitud</h3>
      <p className="mt-1 text-sm text-gray-600">
        Elige laboratorio, adjunta tu orden y describe los exámenes. Recibirás la cotización en esta misma vista.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Laboratorio *</label>
          <select
            value={laboratoryId}
            onChange={(e) => setLaboratoryId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
            required
          >
            <option value="">Selecciona laboratorio</option>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.commune ? ` — ${l.commune}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Exámenes solicitados *</label>
          <textarea
            value={examRequested}
            onChange={(e) => setExamRequested(e.target.value)}
            rows={2}
            placeholder="Ej: Hemograma, perfil bioquímico, TSH..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Orden médica *</label>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sky-700"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">PDF, JPG o PNG. Máx. {MAX_FILE_SIZE_MB} MB.</p>
              {file && <p className="text-xs font-medium text-gray-700">Archivo: {file.name}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Dirección completa *</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Av. Principal 123, depto 4, referencias de acceso"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Número de teléfono *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +56 9 1234 5678"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Comuna *</label>
            <select
              value={comuna}
              onChange={(e) => setComuna(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
              required
            >
              <option value="">Selecciona comuna</option>
              {allCommunes.map(({ commune, region, city }) => (
                <option key={`${commune}-${city}-${region}`} value={commune}>
                  {commune}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Comentarios (opcional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Ej: Portón azul, llamar al llegar..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Preferencia horaria (opcional)</label>
            <input
              type="text"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="Ej: Mañana (09:00–12:00)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
            />
            <p className="mt-1 text-xs text-gray-500">Referencia para coordinar la visita.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
