'use client';

import { useState } from 'react';
import type { HomeExamQuote } from '@/lib/homeExamsStore';

export default function ExamQuoteCard({
  quote,
  onAccept,
  onReject,
  onClarify,
  disabled,
}: {
  quote: HomeExamQuote;
  onAccept: () => void;
  onReject: () => void;
  onClarify: (message: string) => void;
  disabled?: boolean;
}) {
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyText, setClarifyText] = useState('');

  return (
    <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-md ring-1 ring-amber-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cotización del laboratorio</h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{quote.labName}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-right ring-1 ring-sky-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Total</p>
          <p className="text-2xl font-bold text-gray-900">${quote.totalPrice.toLocaleString('es-CL')}</p>
          <p className="mt-0.5 text-xs text-gray-500">IVA incluido</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Exámenes incluidos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {quote.examsIncluded.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Detalles de la visita</p>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            <p>
              Incluye toma a domicilio:{' '}
              <span className="font-semibold">{quote.includesHomeVisit ? 'Sí' : 'No'}</span>
            </p>
            <p>
              Tiempo estimado de visita:{' '}
              <span className="font-semibold">{quote.estimatedVisitTime}</span>
            </p>
          </div>
        </div>
      </div>

      {(quote.fastingInstructions || quote.observations) && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-sky-100">
          {quote.fastingInstructions && (
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Indicaciones previas:</span> {quote.fastingInstructions}
            </p>
          )}
          {quote.observations && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Observaciones:</span> {quote.observations}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || quote.status !== 'ACTIVE'}
          onClick={onAccept}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          Aceptar cotización
        </button>
        <button
          type="button"
          disabled={disabled || quote.status !== 'ACTIVE'}
          onClick={onReject}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setClarifyOpen((v) => !v)}
          className="rounded-xl bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100 disabled:opacity-50"
        >
          Solicitar aclaración
        </button>
      </div>

      {clarifyOpen && (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
          <label className="text-sm font-semibold text-gray-900">Mensaje al laboratorio</label>
          <textarea
            value={clarifyText}
            onChange={(e) => setClarifyText(e.target.value)}
            rows={3}
            placeholder="Ej: ¿La cotización incluye toma a domicilio en mi comuna? ¿Requiere ayuno?"
            className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onClarify(clarifyText);
                setClarifyText('');
                setClarifyOpen(false);
              }}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Enviar aclaración
            </button>
            <button
              type="button"
              onClick={() => setClarifyOpen(false)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
