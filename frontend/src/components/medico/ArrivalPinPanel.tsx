'use client';

type ArrivalPinPanelProps = {
  pin?: string | null;
  confirming?: boolean;
  onConfirmArrival?: () => void;
  showConfirmButton?: boolean;
};

export default function ArrivalPinPanel({
  pin,
  confirming = false,
  onConfirmArrival,
  showConfirmButton = false,
}: ArrivalPinPanelProps) {
  if (!pin && !showConfirmButton) return null;

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Código de llegada</p>
      {pin ? (
        <>
          <p className="mt-2 text-center text-3xl font-bold tracking-[0.35em] text-gray-900">{pin}</p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Entrégaselo al médico cuando llegue a tu domicilio.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-600">El código se mostrará cuando el médico esté asignado.</p>
      )}
      {showConfirmButton && onConfirmArrival ? (
        <button
          type="button"
          onClick={onConfirmArrival}
          disabled={confirming}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
        >
          {confirming ? 'Confirmando…' : 'El médico ya llegó'}
        </button>
      ) : null}
    </div>
  );
}
