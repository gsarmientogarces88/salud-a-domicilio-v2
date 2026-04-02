'use client';

import { useState, useEffect, useRef } from 'react';
import { getExamRequests, addLabResult, type HomeExamRequest } from '@/lib/homeExamsStore';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_MB = 15;

export default function LabExamUpload() {
  const [requests, setRequests] = useState<HomeExamRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [labName, setLabName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRequests(getExamRequests());
  }, []);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

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
    if (!selectedRequest) {
      setError('Selecciona una solicitud de examen.');
      return;
    }
    if (!labName.trim()) {
      setError('Ingresa el nombre del laboratorio.');
      return;
    }
    if (!examDate) {
      setError('Ingresa la fecha del examen.');
      return;
    }
    if (!file) {
      setError('Debes subir el archivo de resultados (PDF o imagen).');
      return;
    }
    setLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fileDataUrl = reader.result as string;
        addLabResult({
          requestId: selectedRequest.id,
          patientId: selectedRequest.patientId,
          patientName: selectedRequest.patientName,
          labName: labName.trim(),
          examDate: new Date(examDate).toISOString(),
          fileName: file.name,
          fileDataUrl,
        });
        setSuccess(true);
        setSelectedRequestId('');
        setLabName('');
        setExamDate('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setRequests(getExamRequests());
        setTimeout(() => setSuccess(false), 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al subir el resultado.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo.');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Subir resultados de laboratorio</h3>
      <p className="mb-4 text-sm text-gray-600">
        Selecciona la solicitud del paciente, sube el archivo de resultados y así el paciente podrá verlos y descargarlos desde su cuenta.
      </p>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Resultados subidos correctamente. El paciente recibirá la información en su sección &quot;Resultados de Exámenes&quot;.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Solicitud del paciente *</label>
          <select
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            required
          >
            <option value="">Selecciona una solicitud</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.patientName} — {r.comuna} — {new Date(r.createdAt).toLocaleDateString('es-CL')}
              </option>
            ))}
          </select>
          {requests.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">No hay solicitudes de exámenes pendientes.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del laboratorio *</label>
          <input
            type="text"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="Ej: Laboratorio Clínico Central"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fecha del examen *</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Archivo de resultados *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sky-700"
          />
          <p className="mt-1 text-xs text-gray-500">PDF, JPG o PNG. Máx. {MAX_FILE_SIZE_MB} MB.</p>
          {file && <p className="mt-1 text-sm text-gray-600">Archivo: {file.name}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || requests.length === 0}
          className="rounded-lg bg-sky-600 px-6 py-2 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? 'Subiendo...' : 'Subir resultados'}
        </button>
      </form>
    </div>
  );
}
