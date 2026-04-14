export declare const BOOKING_TIMEZONE = "America/Santiago";
/** YYYY-MM-DD del instante en Chile (para comparar "mismo día"). */
export declare function calendarDateKeyInChile(d: Date): string;
/** Día de la semana 0=Dom … 6=Sáb según calendario en Chile para esa fecha local. */
export declare function jsWeekdayFromYmdChile(ymd: string): number;
export declare function zonedSlotStartUtc(ymd: string, hhmm: string): Date;
export type BookingViolation = 'SAME_DAY_NOT_ALLOWED' | 'INSUFFICIENT_ANTICIPATION';
export declare function evaluateBookingSlot(slotStart: Date, now?: Date): {
    ok: true;
} | {
    ok: false;
    code: BookingViolation;
};
export declare function assertBookingSlotAllowed(slotStart: Date, now?: Date): void;
export declare function bookingViolationMessage(code: BookingViolation): string;
