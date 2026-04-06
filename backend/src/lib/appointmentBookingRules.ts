import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const BOOKING_TIMEZONE = 'America/Santiago';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** YYYY-MM-DD del instante en Chile (para comparar "mismo día"). */
export function calendarDateKeyInChile(d: Date): string {
  return formatInTimeZone(d, BOOKING_TIMEZONE, 'yyyy-MM-dd');
}

/** Día de la semana 0=Dom … 6=Sáb según calendario en Chile para esa fecha local. */
export function jsWeekdayFromYmdChile(ymd: string): number {
  const noon = fromZonedTime(`${ymd}T12:00:00`, BOOKING_TIMEZONE);
  const isoDow = Number(formatInTimeZone(noon, BOOKING_TIMEZONE, 'i')); // 1=Lun … 7=Dom
  return isoDow === 7 ? 0 : isoDow;
}

export function zonedSlotStartUtc(ymd: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return fromZonedTime(`${ymd}T${hh}:${mm}:00`, BOOKING_TIMEZONE);
}

export type BookingViolation = 'SAME_DAY_NOT_ALLOWED' | 'INSUFFICIENT_ANTICIPATION';

export function evaluateBookingSlot(slotStart: Date, now: Date = new Date()): { ok: true } | { ok: false; code: BookingViolation } {
  const todayKey = calendarDateKeyInChile(now);
  const slotKey = calendarDateKeyInChile(slotStart);
  if (slotKey <= todayKey) {
    return { ok: false, code: 'SAME_DAY_NOT_ALLOWED' };
  }
  if (slotStart.getTime() < now.getTime() + TWELVE_HOURS_MS) {
    return { ok: false, code: 'INSUFFICIENT_ANTICIPATION' };
  }
  return { ok: true };
}

export function assertBookingSlotAllowed(slotStart: Date, now: Date = new Date()): void {
  const r = evaluateBookingSlot(slotStart, now);
  if (r.ok) return;
  const message =
    r.code === 'SAME_DAY_NOT_ALLOWED'
      ? 'No se puede agendar el mismo día. Para hoy usa Atención inmediata o elige una fecha desde mañana.'
      : 'Debe existir al menos 12 horas de anticipación entre ahora y el inicio de la visita.';
  const err = new Error(message) as Error & { code: BookingViolation };
  err.code = r.code;
  throw err;
}

export function bookingViolationMessage(code: BookingViolation): string {
  return code === 'SAME_DAY_NOT_ALLOWED'
    ? 'No se puede agendar el mismo día. Para hoy usa Atención inmediata o elige una fecha desde mañana.'
    : 'Debe existir al menos 12 horas de anticipación entre ahora y el inicio de la visita.';
}
