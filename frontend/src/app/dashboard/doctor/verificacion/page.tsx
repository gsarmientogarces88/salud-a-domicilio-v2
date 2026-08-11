'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchForm } from '@/lib/api';

type DocType =
  | 'CEDULA_ANVERSO'
  | 'CEDULA_REVERSO'
  | 'SELFIE_CON_CEDULA'
  | 'TITULO_MEDICO'
  | 'CERTIFICADO_SIS'
  | 'CERTIFICADO_ESPECIALIDAD';

type DocMeta = {
  id: string;
  type: DocType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
};

type VerificationData = {
  verificationStatus: 'INCOMPLETE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  verificationNote: string | null;
  documentsSubmittedAt: string | null;
  isVerified: boolean;
  specialty: string;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  documents: DocMeta[];
  requiredTypes: DocType[];
};

const CHILE_BANKS = [
  'Banco de Chile',
  'Banco Estado',
  'Banco Santander',
  'Banco BCI',
  'Scotiabank',
  'Banco Itaú',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Security',
  'Banco BICE',
  'Banco Consorcio',
  'Coopeuch',
  'Tenpo',
  'Mach',
  'Otro',
] as const;

type DocFieldConfig = {
  type: DocType;
  label: string;
  helper?: string;
  required: boolean;
  optionalBadge?: boolean;
  warning?: string;
  showExample?: boolean;
  sisLink?: boolean;
};

const CAPA1: DocFieldConfig[] = [
  {
    type: 'CEDULA_ANVERSO',
    label: 'Cédula de identidad — cara frontal',
    helper: 'Debe estar vigente, legible y sin reflejos',
    required: true,
  },
  {
    type: 'CEDULA_REVERSO',
    label: 'Cédula de identidad — cara posterior',
    required: true,
  },
  {
    type: 'SELFIE_CON_CEDULA',
    label: 'Foto sosteniendo tu cédula junto a tu rostro',
    helper:
      'Sujeta tu cédula al lado de tu cara de modo que ambos sean claramente visibles. Para mayor seguridad, incluye un papel escrito a mano con la fecha de hoy.',
    required: true,
    showExample: true,
    warning:
      'La cédula no debe estar tapada, borrosa ni cortada. Las fotos que no cumplan serán rechazadas.',
  },
];

const CAPA2: DocFieldConfig[] = [
  {
    type: 'TITULO_MEDICO',
    label: 'Certificado de Título Médico',
    helper:
      'Emitido por tu universidad. Debe mostrar nombre completo, RUT, universidad y año de titulación.',
    required: true,
  },
  {
    type: 'CERTIFICADO_SIS',
    label: 'Certificado del Registro SIS',
    helper:
      'Descárgalo desde supersalud.gob.cl → Prestadores → Consulta de Registro. Acredita que estás habilitado para ejercer la medicina en Chile.',
    required: true,
    sisLink: true,
  },
  {
    type: 'CERTIFICADO_ESPECIALIDAD',
    label: 'Certificado de especialidad — opcional',
    helper: 'Si declaraste especialidad en el Paso 2, súbelo aquí.',
    required: false,
    optionalBadge: true,
  },
];

const STATUS_LABEL: Record<VerificationData['verificationStatus'], { text: string; className: string }> = {
  INCOMPLETE: { text: 'Documentación incompleta', className: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { text: 'En revisión', className: 'bg-amber-100 text-amber-900' },
  APPROVED: { text: 'Verificado', className: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { text: 'Rechazado — debes corregir', className: 'bg-red-100 text-red-800' },
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DoctorVerificationPage() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState('corriente');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  const byType = useMemo(() => {
    const map = new Map<DocType, DocMeta>();
    data?.documents.forEach((d) => map.set(d.type, d));
    return map;
  }, [data]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ data: VerificationData }>('/doctor/me/verification');
      setData(res.data);
      setBankName(res.data.bankName || '');
      setBankAccountType(res.data.bankAccountType || 'corriente');
      setBankAccountNumber(res.data.bankAccountNumber || '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la verificación');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadDoc = async (type: DocType, file: File) => {
    setUploading(type);
    setMessage('');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      await apiFetchForm('/doctor/me/verification/documents', form);
      setMessage('Documento subido correctamente.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir documento');
    } finally {
      setUploading(null);
    }
  };

  const saveBank = async () => {
    setSavingBank(true);
    setMessage('');
    setError('');
    try {
      await apiFetch('/doctor/me/verification/bank', {
        method: 'PATCH',
        body: JSON.stringify({ bankName, bankAccountType, bankAccountNumber }),
      });
      setMessage('Datos bancarios guardados.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar datos bancarios');
    } finally {
      setSavingBank(false);
    }
  };

  const submitReview = async () => {
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await apiFetch('/doctor/me/verification/bank', {
        method: 'PATCH',
        body: JSON.stringify({ bankName, bankAccountType, bankAccountNumber }),
      });
      await apiFetch('/doctor/me/verification/submit', { method: 'POST' });
      setMessage('Documentación enviada a revisión. Te avisaremos cuando esté lista.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar a revisión');
    } finally {
      setSubmitting(false);
    }
  };

  const requiredOk = useMemo(() => {
    if (!data) return false;
    return data.requiredTypes.every((t) => byType.has(t));
  }, [data, byType]);

  const bankOk = Boolean(bankName.trim() && bankAccountType.trim() && bankAccountNumber.trim());
  const canSubmit =
    requiredOk && bankOk && data?.verificationStatus !== 'SUBMITTED' && data?.verificationStatus !== 'APPROVED';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verificación profesional</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sube tus documentos de identidad y habilitación. Se almacenan de forma privada y solo el
          equipo de revisión de Medicilio puede verlos.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          {data ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_LABEL[data.verificationStatus].className}`}
              >
                {STATUS_LABEL[data.verificationStatus].text}
              </span>
              {data.isVerified ? (
                <span className="text-xs text-emerald-700">Cuenta verificada</span>
              ) : null}
            </div>
          ) : null}

          {data?.verificationNote ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Nota del revisor</p>
              <p className="mt-1">{data.verificationNote}</p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
              {message}
            </p>
          ) : null}

          {/* Seguridad */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs text-sky-950">
            <p className="font-semibold text-sky-900">Almacenamiento y seguridad</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sky-900/90">
              <li>Archivos en almacenamiento privado (no públicos ni indexables)</li>
              <li>Acceso restringido solo al equipo de revisión de Medicilio</li>
            </ul>
          </div>

          {/* CAPA 1 */}
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#0B3A6E]">
                Capa 1 — Identidad
              </h2>
              <p className="mt-1 text-xs text-gray-500">Documentos obligatorios de identidad.</p>
            </div>
            {CAPA1.map((field) => (
              <DocUploadRow
                key={field.type}
                field={field}
                current={byType.get(field.type)}
                uploading={uploading === field.type}
                disabled={uploading !== null || data?.verificationStatus === 'APPROVED'}
                onFile={(file) => void uploadDoc(field.type, file)}
              />
            ))}
          </section>

          {/* CAPA 2 */}
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#0B3A6E]">
                Capa 2 — Habilitación profesional
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Certificados que acreditan tu habilitación para ejercer en Chile.
              </p>
            </div>
            {CAPA2.map((field) => (
              <DocUploadRow
                key={field.type}
                field={field}
                current={byType.get(field.type)}
                uploading={uploading === field.type}
                disabled={uploading !== null || data?.verificationStatus === 'APPROVED'}
                onFile={(file) => void uploadDoc(field.type, file)}
              />
            ))}
          </section>

          {/* Banco */}
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#0B3A6E]">
                Cuenta bancaria para pagos
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Usaremos estos datos para transferirte tus ingresos.
              </p>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Importante</p>
              <p className="mt-1">
                La cuenta bancaria debe estar a nombre de la misma persona. No se aceptarán cuentas
                de terceros.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
                Banco
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona banco</option>
                  {CHILE_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Tipo de cuenta
                <select
                  value={bankAccountType}
                  onChange={(e) => setBankAccountType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="corriente">Cuenta corriente</option>
                  <option value="vista">Cuenta vista</option>
                  <option value="ahorro">Cuenta de ahorro</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Número de cuenta
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^\d-]/g, ''))}
                  placeholder="Solo números"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void saveBank()}
              disabled={savingBank || data?.verificationStatus === 'APPROVED'}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {savingBank ? 'Guardando…' : 'Guardar datos bancarios'}
            </button>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {!requiredOk
                ? 'Completa todos los documentos obligatorios.'
                : !bankOk
                  ? 'Completa los datos bancarios.'
                  : data?.verificationStatus === 'SUBMITTED'
                    ? 'Tu documentación está en revisión.'
                    : data?.verificationStatus === 'APPROVED'
                      ? 'Ya estás verificado.'
                      : 'Listo para enviar a revisión.'}
            </p>
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={!canSubmit || submitting}
              className="rounded-xl bg-[#185FA5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#144E8A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar a revisión'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DocUploadRow({
  field,
  current,
  uploading,
  disabled,
  onFile,
}: {
  field: DocFieldConfig;
  current?: DocMeta;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const inputId = `doc-${field.type}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={inputId} className="text-sm font-semibold text-gray-900">
              {field.label}
              {field.required ? <span className="text-red-500"> *</span> : null}
            </label>
            {field.optionalBadge ? (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Opcional
              </span>
            ) : null}
          </div>
          {field.helper ? <p className="mt-1 text-xs text-gray-500">{field.helper}</p> : null}
          {field.sisLink ? (
            <a
              href="https://www.supersalud.gob.cl/prestadores"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs font-semibold text-[#185FA5] hover:underline"
            >
              Ir al portal SIS →
            </a>
          ) : null}
        </div>
        <div className="shrink-0">
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold ${
              disabled
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-[#185FA5] text-white hover:bg-[#144E8A]'
            }`}
          >
            {uploading ? 'Subiendo…' : current ? 'Reemplazar' : 'Subir archivo'}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {field.showExample ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-[#C5D5E5] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/selfie-cedula-ejemplo.svg"
            alt="Ejemplo ilustrativo: sostén tu cédula junto al rostro e incluye la fecha escrita a mano"
            className="mx-auto h-auto w-full max-w-sm"
          />
          <p className="border-t border-gray-100 px-3 py-2 text-center text-[11px] text-gray-500">
            Imagen ilustrativa de ejemplo
          </p>
        </div>
      ) : null}

      {field.warning ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {field.warning}
        </p>
      ) : null}

      {current ? (
        <p className="mt-2 text-xs text-emerald-700">
          ✓ {current.originalName} · {formatBytes(current.sizeBytes)}
        </p>
      ) : (
        <p className="mt-2 text-xs text-gray-400">PDF o imagen (jpg, png, webp) · máx. 12 MB</p>
      )}
    </div>
  );
}
