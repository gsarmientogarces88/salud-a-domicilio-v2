"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOKING_TIMEZONE = void 0;
exports.calendarDateKeyInChile = calendarDateKeyInChile;
exports.jsWeekdayFromYmdChile = jsWeekdayFromYmdChile;
exports.zonedSlotStartUtc = zonedSlotStartUtc;
exports.evaluateBookingSlot = evaluateBookingSlot;
exports.assertBookingSlotAllowed = assertBookingSlotAllowed;
exports.bookingViolationMessage = bookingViolationMessage;
const date_fns_tz_1 = require("date-fns-tz");
exports.BOOKING_TIMEZONE = 'America/Santiago';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
/** YYYY-MM-DD del instante en Chile (para comparar "mismo día"). */
function calendarDateKeyInChile(d) {
    return (0, date_fns_tz_1.formatInTimeZone)(d, exports.BOOKING_TIMEZONE, 'yyyy-MM-dd');
}
/** Día de la semana 0=Dom … 6=Sáb según calendario en Chile para esa fecha local. */
function jsWeekdayFromYmdChile(ymd) {
    const noon = (0, date_fns_tz_1.fromZonedTime)(`${ymd}T12:00:00`, exports.BOOKING_TIMEZONE);
    const isoDow = Number((0, date_fns_tz_1.formatInTimeZone)(noon, exports.BOOKING_TIMEZONE, 'i')); // 1=Lun … 7=Dom
    return isoDow === 7 ? 0 : isoDow;
}
function zonedSlotStartUtc(ymd, hhmm) {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return (0, date_fns_tz_1.fromZonedTime)(`${ymd}T${hh}:${mm}:00`, exports.BOOKING_TIMEZONE);
}
function evaluateBookingSlot(slotStart, now = new Date()) {
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
function assertBookingSlotAllowed(slotStart, now = new Date()) {
    const r = evaluateBookingSlot(slotStart, now);
    if (r.ok)
        return;
    const message = r.code === 'SAME_DAY_NOT_ALLOWED'
        ? 'No se puede agendar el mismo día. Para hoy usa Atención inmediata o elige una fecha desde mañana.'
        : 'Debe existir al menos 12 horas de anticipación entre ahora y el inicio de la visita.';
    const err = new Error(message);
    err.code = r.code;
    throw err;
}
function bookingViolationMessage(code) {
    return code === 'SAME_DAY_NOT_ALLOWED'
        ? 'No se puede agendar el mismo día. Para hoy usa Atención inmediata o elige una fecha desde mañana.'
        : 'Debe existir al menos 12 horas de anticipación entre ahora y el inicio de la visita.';
}
