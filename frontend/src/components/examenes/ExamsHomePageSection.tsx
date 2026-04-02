'use client';

import { useEffect, useMemo, useState } from 'react';
import HomeExamRequestForm from '@/components/examenes/HomeExamRequestForm';
import PatientExamSummary from '@/components/examenes/PatientExamSummary';
import PatientExamStatusTimeline from '@/components/examenes/PatientExamStatusTimeline';
import PatientExamQuoteCard from '@/components/examenes/PatientExamQuoteCard';
import PatientExamResultsCard from '@/components/examenes/PatientExamResultsCard';
import ExamRequestTimeline from '@/components/examenes/ExamRequestTimeline';
import { usePatientLabExam } from '@/hooks/usePatientLabExam';
import { formatExamDateTime } from '@/components/examenes/examDateUtils';
import { fetchPatientLabExams } from '@/lib/labExamsApi';

const ACTIVE_KEY = 'salud_active_lab_exam_id';

function Stepper() {
  const steps = [
    'Elige laboratorio y sube tu orden',
    'Describe los exámenes y tus datos',
    'El laboratorio revisa y cotiza',
    'Aceptas o rechazas en esta misma pantalla',
    'Coordinación, visita y resultados',
  ];

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {steps.map((s, idx) => (
        <div key={s} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-sky-100">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
            {idx + 1}
          </div>
          <p className="text-sm text-gray-700">{s}</p>
        </div>
      ))}
    </div>
  );
}

export type ExamsHomePageSectionVariant = 'default' | 'standalone';

export default function ExamsHomePageSection({
  patientId,
  patientName,
  variant = 'default',
}: {
  patientId: string;
  patientName: string;
  variant?: ExamsHomePageSectionVariant;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'track'>('create');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) {
      setActiveId(stored);
      setMode('track');
      return;
    }
    fetchPatientLabExams()
      .then((res) => {
        const latest = res.data[0];
        if (latest && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(latest.status)) {
          setActiveId(latest.id);
          setMode('track');
          localStorage.setItem(ACTIVE_KEY, latest.id);
        }
      })
      .catch(() => {});
  }, [patientId]);

  const { request, error, loading, actions } = usePatientLabExam(activeId);

  const timelineItems = useMemo(() => {
    return (request?.events || []).map((e) => ({
      title: e.message,
      date: formatExamDateTime(e.createdAt),
    }));
  }, [request?.events]);

  const scrollToForm = () => {
    document.getElementById('solicitar-examenes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="rounded-3xl bg-gradient-to-b from-sky-50 via-white to-white p-6 ring-1 ring-sky-100">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {variant === 'default' && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Exámenes a domicilio
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">Solicitar exámenes a domicilio</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
                Sube tu orden médica y recibe la cotización del laboratorio en esta página.
              </p>
            </>
          )}
          {variant === 'standalone' && mode === 'create' && (
            <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-sky-100">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Flujo:</span> laboratorio → orden → cotización → decisión
                → visita → resultados.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 sm:w-auto"
                >
                  Solicitar exámenes
                </button>
              </div>
            </div>
          )}
          {mode === 'create' && <Stepper />}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {mode === 'track' && (
            <>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(ACTIVE_KEY);
                  setActiveId(null);
                  setMode('create');
                }}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              >
                Nueva solicitud
              </button>
              <button
                type="button"
                onClick={() => actions.refresh()}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Actualizar ahora
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
          {mode === 'track' && (
            <span className="mt-2 block text-xs text-red-600/90">
              Comprueba que el API esté corriendo y que hayas aplicado el esquema de base de datos (Prisma).
            </span>
          )}
        </div>
      )}

      {mode === 'track' && activeId && loading && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-sky-100 bg-white py-14 text-center ring-1 ring-sky-50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" aria-hidden />
          <p className="text-sm font-medium text-gray-700">Cargando tu solicitud…</p>
          <p className="max-w-sm text-xs text-gray-500">Esto solo toma un momento.</p>
        </div>
      )}

      {mode === 'create' && (
        <div id="solicitar-examenes" className="mt-6 scroll-mt-24">
          <HomeExamRequestForm
            patientId={patientId}
            patientName={patientName}
            onSuccess={(createdId) => {
              localStorage.setItem(ACTIVE_KEY, createdId);
              setActiveId(createdId);
              setMode('track');
            }}
          />
          <div className="mt-4 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600 ring-1 ring-sky-100">
            <p>
              <span className="font-semibold text-gray-900">Tiempo estimado de respuesta:</span> según carga del
              laboratorio (típicamente minutos a pocas horas hábiles).
            </p>
            <p className="mt-1">
              El seguimiento aparece abajo automáticamente.{' '}
              <span className="font-medium text-gray-800">No necesitas recargar la página.</span>
            </p>
          </div>
        </div>
      )}

      {mode === 'track' && request && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <PatientExamSummary request={request} />

            <PatientExamStatusTimeline currentStatus={request.status} />

            {(request.status === 'PENDING' || request.status === 'IN_REVIEW') && (
              <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-sky-900">Solicitud enviada</p>
                <p className="mt-1 text-sm text-sky-800">
                  El laboratorio revisará tu orden y emitirá una cotización con precio y fecha propuesta.
                </p>
              </div>
            )}

            {request.status === 'QUOTED' && request.quote && (
              <PatientExamQuoteCard
                request={request}
                quote={request.quote}
                onAccept={() => actions.acceptQuote()}
                onReject={() => actions.rejectQuote()}
              />
            )}

            {request.status === 'PATIENT_ACCEPTED' && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 ring-1 ring-emerald-100">
                <p className="text-sm font-semibold text-emerald-900">Cotización aceptada</p>
                <p className="mt-1 text-sm text-emerald-800">
                  El laboratorio agendará la visita. Verás la fecha en esta página cuando quede confirmada.
                </p>
              </div>
            )}

            {(request.status === 'SCHEDULED' || request.status === 'SAMPLE_COLLECTED') && (
              <div className="rounded-3xl border border-sky-200 bg-white p-6 ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-gray-900">Visita coordinada</p>
                {request.appointments[0] && (
                  <p className="mt-2 text-sm text-gray-700">
                    Inicio: {formatExamDateTime(request.appointments[0].startAt)}
                  </p>
                )}
              </div>
            )}

            {request.status === 'RESULTS_READY' && (
              <PatientExamResultsCard requestId={request.id} results={request.results} />
            )}

            {request.status === 'COMPLETED' && (
              <PatientExamResultsCard requestId={request.id} results={request.results} />
            )}

            {request.status !== 'CANCELLED' &&
              request.status !== 'REJECTED' &&
              request.status !== 'COMPLETED' && (
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">¿Necesitas cancelar?</p>
                      <p className="mt-1 text-sm text-gray-600">Solo si aún aplica según el avance.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => actions.cancel('Cancelada por el paciente')}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                    >
                      Cancelar solicitud
                    </button>
                  </div>
                </div>
              )}
          </div>

          <div className="space-y-4">
            <ExamRequestTimeline items={timelineItems} />
            <p className="rounded-2xl bg-white/80 px-4 py-3 text-xs text-gray-500 ring-1 ring-sky-100">
              Actualización automática mientras la solicitud está en curso.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
