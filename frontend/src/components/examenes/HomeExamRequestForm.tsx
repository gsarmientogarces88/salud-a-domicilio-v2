'use client';

import { useRef, useState } from 'react';
import { createPatientLabExam } from '@/lib/labExamsApi';
import AddressGeolocationField from '@/components/ui/AddressGeolocationField';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_MB = 10;

export interface HomeExamRequestFormProps {
  patientId: string;
  patientName: string;
  onSuccess?: (requestId: string) => void;
}

export default function HomeExamRequestForm({ patientName, onSuccess }: HomeExamRequestFormProps) {
  const [examRequested, setExamRequested] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeRange, setPreferredTimeRange] = useState('');
  const [comments, setComments] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return setError('Formato no permitido. Usa PDF, JPG o PNG.');
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return setError(`El archivo no debe superar ${MAX_FILE_SIZE_MB} MB.`);
    setError('');
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!examRequested.trim()) return setError('Describe los exámenes solicitados.');
    if (!region || !province || !commune) return setError('Selecciona región, provincia y comuna.');
    if (!address.trim()) return setError('Ingresa tu dirección.');
    if (!phone.trim()) return setError('Ingresa tu número de teléfono.');
    if (!email.trim()) return setError('Ingresa correo electrónico.');
    if (!preferredDate || !preferredTimeRange.trim()) return setError('Ingresa preferencia horaria (día y franja).');
    if (!coords) return setError('Confirma la ubicación en el mapa.');
    if (!file) return setError('Debes subir tu orden médica (PDF, JPG o PNG).');

    setLoading(true);
    try {
      const form = new FormData();
      form.append('orderFile', file);
      form.append('patientName', patientName);
      form.append('examRequested', examRequested.trim());
      form.append('address', address.trim());
      form.append('region', region);
      form.append('province', province);
      form.append('commune', commune);
      form.append('phone', phone.trim());
      form.append('email', email.trim());
      form.append('preferredDate', new Date(preferredDate).toISOString());
      form.append('preferredTimeRange', preferredTimeRange.trim());
      form.append('latitude', String(coords.lat));
      form.append('longitude', String(coords.lng));
      if (comments.trim()) form.append('observationsPatient', comments.trim());

      const res = await createPatientLabExam(form);
      setExamRequested('');
      setRegion('');
      setProvince('');
      setCommune('');
      setAddress('');
      setPhone('');
      setEmail('');
      setPreferredDate('');
      setPreferredTimeRange('');
      setComments('');
      setCoords(null);
      setFile(null);
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
      <h3 className="text-lg font-semibold text-gray-900">Etapa 1: Enviar solicitud</h3>
      <p className="mt-1 text-sm text-gray-600">Completa los datos y enviaremos tu solicitud a laboratorios compatibles de tu zona.</p>

      {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>}

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Exámenes solicitados *</label>
          <textarea value={examRequested} onChange={(e) => setExamRequested(e.target.value)} rows={2} placeholder="Ej: Hemograma, perfil bioquímico..." className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Orden médica *</label>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sky-700" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">PDF, JPG o PNG. Máx. {MAX_FILE_SIZE_MB} MB.</p>
              {file && <p className="text-xs font-medium text-gray-700">Archivo: {file.name}</p>}
            </div>
          </div>
        </div>

        <AddressGeolocationField
          region={region}
          province={province}
          commune={commune}
          address={address}
          coords={coords}
          onRegionChange={setRegion}
          onProvinceChange={setProvince}
          onCommuneChange={setCommune}
          onAddressChange={setAddress}
          onCoordsChange={setCoords}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Teléfono *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +56 9 1234 5678" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Correo electrónico *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@email.com" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Día preferido *</label>
            <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Franja horaria *</label>
            <input type="text" value={preferredTimeRange} onChange={(e) => setPreferredTimeRange(e.target.value)} placeholder="Ej: 09:00 - 12:00" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">Comentarios (opcional)</label>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" />
        </div>
      </div>

      <div className="mt-6">
        <button type="submit" disabled={loading} className="w-full rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50">
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
