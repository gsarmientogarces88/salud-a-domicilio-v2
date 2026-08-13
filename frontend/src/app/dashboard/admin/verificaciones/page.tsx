'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type DocMeta = {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
};

type VerificationRow = {
  id: string;
  specialty: string;
  isVerified: boolean;
  verificationStatus: 'INCOMPLETE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  verificationNote: string | null;
  documentsSubmittedAt: string | null;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  verifiedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  verificationDocs: DocMeta[];
};

const DOC_LABELS: Record<string, string> = {
  CEDULA_ANVERSO: 'Cédula — frontal',
  CEDULA_REVERSO: 'Cédula — posterior (opcional / legado)',
  SELFIE_CON_CEDULA: 'Foto de rostro',
  TITULO_MEDICO: 'Título médico',
  CERTIFICADO_SIS: 'Certificado SIS',
  CERTIFICADO_ESPECIALIDAD: 'Especialidad',
};

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'SUBMITTED', label: 'En revisión' },
  { value: 'INCOMPLETE', label: 'Incompletos' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
] as const;

export default function AdminVerificationsPage() {
  const [status, setStatus] = useState('SUBMITTED');
  const [list, setList] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<VerificationRow | null>(null);
  const [viewerDoc, setViewerDoc] = useState<DocMeta | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await apiFetch<{ data: VerificationRow[] }>(`/admin/verifications${q}`);
      setList(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    };
  }, [viewerUrl]);

  const openViewer = async (doc: DocMeta) => {
    setViewerDoc(doc);
    setViewerLoading(true);
    if (viewerUrl) {
      URL.revokeObjectURL(viewerUrl);
      setViewerUrl(null);
    }
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/verifications/documents/${doc.id}/view`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('No se pudo abrir el documento');
      const blob = await res.blob();
      setViewerUrl(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al abrir documento');
      setViewerDoc(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
    setViewerDoc(null);
  };

  const decide = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setActing(true);
    setError('');
    try {
      await apiFetch(`/admin/verifications/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, note }),
      });
      setSelected(null);
      setNote('');
      closeViewer();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verificación de médicos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Revisa documentos de identidad y habilitación. Los archivos son privados; el visor es inline
          sin descarga obligatoria.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === f.value
                ? 'bg-[#185FA5] text-white'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          No hay médicos en este filtro.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setSelected(row);
                setNote(row.verificationNote || '');
                closeViewer();
              }}
              className={`flex w-full flex-col gap-1 rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition hover:ring-sky-300 ${
                selected?.id === row.id ? 'ring-sky-400' : 'ring-gray-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {row.user.firstName} {row.user.lastName}
                </span>
                <StatusPill status={row.verificationStatus} />
                <span className="text-xs text-gray-500">· {row.specialty}</span>
              </div>
              <p className="text-sm text-gray-500">{row.user.email}</p>
              <p className="text-xs text-gray-400">
                {row.verificationDocs.length} documento(s)
                {row.documentsSubmittedAt
                  ? ` · Enviado ${new Date(row.documentsSubmittedAt).toLocaleString('es-CL')}`
                  : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selected.user.firstName} {selected.user.lastName}
              </h2>
              <p className="text-sm text-gray-500">{selected.user.email}</p>
              <p className="text-xs text-gray-400">
                {selected.specialty} · Licencia en perfil · {selected.user.phone || 'Sin teléfono'}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">Cuenta bancaria</p>
              <p className="mt-1">
                {selected.bankName || '—'} · {selected.bankAccountType || '—'} ·{' '}
                {selected.bankAccountNumber || '—'}
              </p>
              <p className="mt-1 text-amber-800">
                Debe estar a nombre de la misma persona (no cuentas de terceros).
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Documentos
              </p>
              {selected.verificationDocs.length === 0 ? (
                <p className="text-sm text-gray-400">Sin documentos subidos</p>
              ) : (
                selected.verificationDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => void openViewer(doc)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      viewerDoc?.id === doc.id
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-gray-200 hover:border-sky-300'
                    }`}
                  >
                    <span>
                      <span className="font-medium text-gray-900">
                        {DOC_LABELS[doc.type] || doc.type}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">{doc.originalName}</span>
                    </span>
                    <span className="text-xs font-semibold text-[#185FA5]">Ver</span>
                  </button>
                ))
              )}
            </div>

            <label className="block text-xs font-medium text-gray-600">
              Nota para el médico
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Opcional al aprobar; recomendada al rechazar"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={acting}
                onClick={() => void decide('approve')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void decide('reject')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  closeViewer();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </section>

          <section className="min-h-[420px] rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Visor inline
            </p>
            {viewerLoading ? (
              <p className="text-sm text-gray-500">Cargando documento…</p>
            ) : !viewerDoc || !viewerUrl ? (
              <div className="flex h-[380px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                Selecciona un documento para previsualizarlo aquí
              </div>
            ) : viewerDoc.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewerUrl}
                alt={viewerDoc.originalName}
                className="max-h-[520px] w-full rounded-lg object-contain"
              />
            ) : (
              <iframe
                title={viewerDoc.originalName}
                src={viewerUrl}
                className="h-[520px] w-full rounded-lg border border-gray-200"
              />
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: VerificationRow['verificationStatus'] }) {
  const map = {
    INCOMPLETE: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-amber-100 text-amber-900',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
  } as const;
  const labels = {
    INCOMPLETE: 'Incompleto',
    SUBMITTED: 'En revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
  } as const;
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${map[status]}`}>
      {labels[status]}
    </span>
  );
}
