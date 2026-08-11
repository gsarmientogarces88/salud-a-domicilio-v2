'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchLabRequest, postLabComplete, postLabQuote, postLabResult, postLabSchedule, postSampleCollected } from '@/lib/laboratoryApi';

export default function LaboratorioSolicitudDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [labObs, setLabObs] = useState('');
  const [estHours, setEstHours] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [now, setNow] = useState(Date.now());
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const load = () => fetchLabRequest(id).then((r) => setRow(r.data)).catch((e) => setError(e instanceof Error ? e.message : 'Error'));
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

  async function handleQuoteSubmit() {
    if (!price || busy || row?.ownQuote) return;
    setBusy(true);
    setError('');
    try {
      await postLabQuote(id, {
        priceClp: parseInt(price, 10),
        proposedDate: proposedDate ? new Date(proposedDate).toISOString() : undefined,
        proposedTimeRange: timeRange || undefined,
        comment: labObs || undefined,
        estimatedResultsHours: estHours ? parseInt(estHours, 10) : undefined,
      });
      setSuccessMessage('Cotización enviada correctamente. Te redirigimos al listado para esperar respuesta del paciente.');
      await load();
      window.setTimeout(() => {
        router.push('/dashboard/laboratorio/solicitudes?status=QUOTED');
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!row && !error) return <div className="text-gray-600">Cargando…</div>;
  if (!row) return <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">{error || 'No encontrado'}</div>;

  const remaining = row.quoteDeadlineAt ? Math.max(0, new Date(row.quoteDeadlineAt).getTime() - now) : 0;
  const mmss = `${Math.floor(remaining / 60000).toString().padStart(2, '0')}:${Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, '0')}`;
  const apiBase =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL?.replace(/\/?api\/?$/, '')) || 'http://localhost:4000';
  const orderHref = row.orderFileUrl ? `${apiBase}${row.orderFileUrl}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button type="button" onClick={() => router.back()} className="text-sm text-teal-700 hover:underline">← Volver</button>
      <header>
        <p className="text-xs font-semibold uppercase text-gray-500">{row.displayId}</p>
        <h1 className="text-2xl font-bold text-gray-900">{row.patientName}</h1>
        <p className="mt-1 text-gray-600">{row.examRequested}</p>
      </header>
      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {successMessage}
        </div>
      )}
      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Datos del paciente</h2>
        <dl className="mt-3 grid gap-2 text-sm text-gray-700">
          <div><dt className="font-medium text-gray-500">Dirección</dt><dd>{row.address}</dd></div>
          <div><dt className="font-medium text-gray-500">Comuna</dt><dd>{row.commune}</dd></div>
          <div><dt className="font-medium text-gray-500">Correo / Teléfono</dt><dd>{row.email} · {row.phone}</dd></div>
          <div><dt className="font-medium text-gray-500">Preferencia</dt><dd>{row.preferredDate ? new Date(row.preferredDate).toLocaleDateString('es-CL') : 'Sin fecha'} · {row.preferredTimeRange || 'Sin franja'}</dd></div>
          {orderHref ? <div><dt className="font-medium text-gray-500">Orden médica</dt><dd><a href={orderHref} target="_blank" rel="noreferrer" className="text-teal-700 underline">{row.orderFileName || 'Ver archivo'}</a></dd></div> : null}
        </dl>
      </section>

      {(row.status === 'PENDING_QUOTES' || row.status === 'QUOTED') && (
        <section className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
          {row.ownQuote ? (
            <>
              <h2 className="font-semibold text-gray-900">Esperando respuesta del paciente</h2>
              <p className="text-sm text-gray-700">
                Ya enviaste tu cotización para esta solicitud. Estado actual: <span className="font-semibold">{row.ownQuote.status}</span>.
              </p>
              <div className="grid gap-2 rounded-xl border border-amber-200 bg-white p-4 text-sm text-gray-700">
                <p><span className="font-medium text-gray-500">Precio:</span> ${Number(row.ownQuote.priceClp || 0).toLocaleString('es-CL')} CLP</p>
                <p><span className="font-medium text-gray-500">Fecha propuesta:</span> {row.ownQuote.proposedDate ? new Date(row.ownQuote.proposedDate).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
                <p><span className="font-medium text-gray-500">Franja:</span> {row.ownQuote.proposedTimeRange || 'Sin franja'}</p>
                <p><span className="font-medium text-gray-500">Comentario:</span> {row.ownQuote.comment || 'Sin comentario'}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/laboratorio/solicitudes?status=QUOTED')}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Ir al listado de cotizaciones enviadas
              </button>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900">Cotizar solicitud</h2>
              <p className="text-sm text-gray-700">Tiempo restante para cotizar: <span className="font-semibold">{mmss}</span></p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="text-sm font-medium text-gray-700">Precio (CLP)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Fecha propuesta</label><input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Franja horaria</label><input type="text" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Ej: 08:00 - 11:00" /></div>
                <div><label className="text-sm font-medium text-gray-700">Horas para resultados</label><input type="number" value={estHours} onChange={(e) => setEstHours(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></div>
                <div className="sm:col-span-2"><label className="text-sm font-medium text-gray-700">Comentario</label><textarea value={labObs} onChange={(e) => setLabObs(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></div>
              </div>
              <button
                type="button"
                disabled={busy || !price}
                onClick={() => void handleQuoteSubmit()}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Enviar cotización
              </button>
            </>
          )}
        </section>
      )}

      {row.status === 'LAB_SELECTED' && (
        <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Agendar visita</h2>
          <input type="datetime-local" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:max-w-xs" />
          <button type="button" disabled={busy || !scheduleStart} onClick={() => run(() => postLabSchedule(id, { startAt: new Date(scheduleStart).toISOString() }))} className="mt-3 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Confirmar agenda</button>
        </section>
      )}

      {row.status === 'SCHEDULED' && <button type="button" disabled={busy} onClick={() => run(() => postSampleCollected(id))} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Registrar muestra tomada</button>}

      {['SCHEDULED', 'SAMPLE_COLLECTED'].includes(row.status) && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Subir resultado</h2>
          <form className="mt-3 space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement)?.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('publish', 'true');
            await run(() => postLabResult(id, fd));
            e.currentTarget.reset();
          }}>
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required className="text-sm" />
            <button type="submit" disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Subir y publicar</button>
          </form>
        </section>
      )}

      {row.status === 'RESULTS_READY' && <button type="button" disabled={busy} onClick={() => run(() => postLabComplete(id))} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">Marcar como completado</button>}
    </div>
  );
}
