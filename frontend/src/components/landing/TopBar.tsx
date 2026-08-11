import { LANDING_CONTACT } from '@/lib/landingConfig';

export default function TopBar() {
  return (
    <div className="bg-[#0B3A6E] text-[12px] text-white">
      <div className="mx-auto flex h-9 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <p className="inline-flex items-center gap-2 font-medium text-sky-100">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate">
            {LANDING_CONTACT.coverage} <span className="text-sky-200">•</span> Disponible ahora
          </span>
        </p>
        <a
          href={`tel:${LANDING_CONTACT.phoneTel}`}
          className="hidden items-center gap-2 text-sky-100 transition hover:text-white sm:inline-flex"
        >
          <PhoneIcon />
          <span>{LANDING_CONTACT.phoneDisplay}</span>
          <span className="text-sky-300">·</span>
          <span>Soporte 24/7</span>
        </a>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.6 10.8c1.6 3.1 3.9 5.4 7 7l2.3-2.3c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        fill="currentColor"
      />
    </svg>
  );
}
