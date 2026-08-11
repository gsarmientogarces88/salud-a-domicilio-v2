'use client';

import { whatsappUrl } from '@/lib/landingConfig';

export default function SoportePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
        <p className="mt-1 text-sm text-gray-600">
          Centro de ayuda Medicilio. Horario de atención: lunes a viernes, 10:00–18:00.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-950">WhatsApp</h2>
        <p className="mt-2 text-sm text-emerald-900/90">
          Escríbenos para consultas sobre urgencias, agenda o tu cuenta. Te respondemos en horario hábil.
        </p>
        <a
          href={whatsappUrl('Hola Medicilio, necesito ayuda con mi cuenta / solicitud.')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Abrir WhatsApp
        </a>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Temas frecuentes</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Estado de una urgencia o agenda</li>
          <li>Cambiar dirección o teléfono de contacto</li>
          <li>Problemas de pago o acceso a la cuenta</li>
        </ul>
      </div>
    </div>
  );
}
