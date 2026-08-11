const CHILE_TZ = 'America/Santiago';

/** YYYY-MM-DD en calendario local del navegador (evita desfase UTC de toISOString). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD según calendario Chile (preferir para agenda médica). */
export function formatChileYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CHILE_TZ }).format(d);
}

/** Hora HH:mm para mostrar un slot ISO en Chile. */
export function formatChileTimeFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', {
    timeZone: CHILE_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 0=Dom … 6=Sáb en calendario Chile. */
export function jsWeekdayChile(d: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: CHILE_TZ, weekday: 'short' }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? d.getDay();
}
