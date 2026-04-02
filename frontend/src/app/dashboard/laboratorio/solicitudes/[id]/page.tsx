'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchLabRequest,
  postLabComplete,
  postLabQuote,
  postLabReject,
  postLabReview,
  postLabResult,
  postLabSchedule,
  postSampleCollected,
  publishLabResult,
} from '@/lib/laboratoryApi';

export default function LaboratorioSolicitudDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [price, setPrice] = useState('');
  const [proposedVisitAt, setProposedVisitAt] = useState('');
  const [labObs, setLabObs] = useState('');
  const [estHours, setEstHours] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');

  const load = () =>
    fetchLabRequest(id)
      .then((r) => setRow(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));

  useEffect(() => {
    load();
  }, [id]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!row && !error) {
    return <div className="text-gray-600">Cargando…</div>;
  }

  if (!row) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">
        {error || 'No encontrado'}{' '}
        <button type="button" className="ml-2 underline" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    );
  }

  const apiBase =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL?.replace(/\/?api\/?$/, '')) ||
    'http://localhost:4000';
  const orderHref = row.orderFileUrl ? `${apiBase}${row.orderFileUrl}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button type="button" onClick={() => router.back()} className="text-sm text-teal-700 hover:underline">
        ← Volver
      </button>

      <header>
        <p className="text-xs font-semibold uppercase text-gray-500">{row.displayId}</p>
        <h1 className="text-2xl font-bold text-gray-900">{row.patientName}</h1>
        <p className="mt-1 text-gray-600">{row.examRequested}</p>
        <span className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 ring-1 ring-gray-200">
          {row.status}
        </span>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Datos de contacto y visita</h2>
        <dl className="mt-3 grid gap-2 text-sm text-gray-700">
          <div>
            <dt className="font-medium text-gray-500">Dirección</dt>
            <dd>{row.address}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Comuna</dt>
            <dd>{row.commune}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Teléfono</dt>
            <dd>{row.phone}</dd>
          </div>
          {row.observationsPatient && (
            <div>
              <dt className="font-medium text-gray-500">Observaciones</dt>
              <dd>{row.observationsPatient}</dd>
            </div>
          )}
          {orderHref && (
            <div>
              <dt className="font-medium text-gray-500">Orden médica</dt>
              <dd>
                <a href={orderHref} target="_blank" rel="noreferrer" className="text-teal-700 underline">
                  {row.orderFileName || 'Ver archivo'}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {['PENDING', 'IN_REVIEW'].includes(row.status) && (
        <section className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
          <h2 className="font-semibold text-gray-900">Acciones</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || row.status !== 'PENDING'}
              onClick={() => run(() => postLabReview(id))}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              Marcar en revisión
            </button>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Rechazar solicitud</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Motivo"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => postLabReject(id, rejectReason))}
              className="mt-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Rechazar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Precio (CLP)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha propuesta (ISO local)</label>
              <input
                type="datetime-local"
                value={proposedVisitAt}
                onChange={(e) => setProposedVisitAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Observaciones laboratorio</label>
              <textarea
                value={labObs}
                onChange={(e) => setLabObs(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Horas estimadas para resultados</label>
              <input
                type="number"
                value={estHours}
                onChange={(e) => setEstHours(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                postLabQuote(id, {
                  priceClp: parseInt(price, 10),
                  proposedVisitAt: proposedVisitAt ? new Date(proposedVisitAt).toISOString() : undefined,
                  labObservations: labObs || undefined,
                  estimatedResultsHours: estHours ? parseInt(estHours, 10) : undefined,
                })
              )
            }
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Enviar cotización
          </button>
        </section>
      )}

      {row.status === 'PATIENT_ACCEPTED' && (
        <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Agendar visita</h2>
          <input
            type="datetime-local"
            value={scheduleStart}
            onChange={(e) => setScheduleStart(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
          />
          <button
            type="button"
            disabled={busy || !scheduleStart}
            onClick={() =>
              run(() =>
                postLabSchedule(id, {
                  startAt: new Date(scheduleStart).toISOString(),
                })
              )
            }
            className="mt-3 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Confirmar agenda
          </button>
        </section>
      )}

      {row.status === 'SCHEDULED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => postSampleCollected(id))}
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Registrar muestra tomada
        </button>
      )}

      {['SCHEDULED', 'SAMPLE_COLLECTED'].includes(row.status) && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Subir resultado</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement)?.files?.[0];
              if (!file) return;
              const obs = (e.currentTarget.elements.namedItem('observations') as HTMLTextAreaElement)?.value;
              const fd = new FormData();
              fd.append('file', file);
              if (obs?.trim()) fd.append('observations', obs.trim());
              fd.append('publish', 'true');
              await run(() => postLabResult(id, fd));
              e.currentTarget.reset();
            }}
          >
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required className="text-sm" />
            <textarea
              name="observations"
              rows={2}
              placeholder="Observaciones (opcional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Subir y publicar
            </button>
          </form>
        </section>
      )}

      {row.status === 'RESULTS_READY' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => postLabComplete(id))}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            Marcar como completado
          </button>
          {row.results?.filter((x: any) => !x.published).map((r: any) => (
            <button
              key={r.id}
              type="button"
              disabled={busy}
              onClick={() => run(() => publishLabResult(r.id))}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-800 ring-1 ring-teal-200"
            >
              Publicar borrador {r.fileName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
