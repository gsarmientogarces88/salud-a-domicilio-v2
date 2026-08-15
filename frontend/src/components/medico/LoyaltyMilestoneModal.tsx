'use client';

export type UnseenMilestone = {
  id: string;
  pointsRequired: number;
  congratulationTitle: string;
  congratulationBody: string;
};

export default function LoyaltyMilestoneModal({
  milestone,
  onClose,
}: {
  milestone: UnseenMilestone;
  onClose: () => void;
}) {
  const points = milestone.pointsRequired.toLocaleString('es-CL');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loyalty-milestone-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Medicilio Puntos</p>
        <h2 id="loyalty-milestone-title" className="mt-2 text-xl font-bold text-gray-900">
          🎉 ¡Nueva meta alcanzada!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          Has completado {points} atenciones a través de Medicilio.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Gracias por formar parte de nuestra red médica.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
