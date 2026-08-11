const METHODS = [
  'Webpay',
  'Débito',
  'Crédito',
  'Transferencia',
  'Bono Isapre',
  'Efectivo',
] as const;

export default function Payments() {
  return (
    <section className="border-y border-[#E5EAF0] bg-[#F3F6F9]" aria-label="Métodos de pago">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Métodos de pago</span>
        {METHODS.map((method) => (
          <span key={method} className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#185FA5] ring-1 ring-[#E5EAF0]">
              <CardMini />
            </span>
            {method}
          </span>
        ))}
      </div>
    </section>
  );
}

function CardMini() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
