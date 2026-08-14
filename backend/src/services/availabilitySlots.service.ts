import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import prisma from '../lib/prisma';
import {
  BOOKING_TIMEZONE,
  calendarDateKeyInChile,
  jsWeekdayFromYmdChile,
  zonedSlotStartUtc,
} from '../lib/appointmentBookingRules';

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Hora inválida: ${time}`);
  }
  return h * 60 + m;
}

function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${h}:${mm}`;
}

type DayRule = {
  startTime: string;
  endTime: string;
  slotDuration: number;
  bufferMinutes: number;
};

const DEFAULT_WEEKDAY_RULE: DayRule = {
  startTime: '09:00',
  endTime: '18:00',
  slotDuration: 60,
  bufferMinutes: 0,
};

/** Genera bloques HH:MM a partir de reglas diarias, excluyendo rangos bloqueados. */
function computeSlotStarts(rules: DayRule[], blockedRanges: { start: number; end: number }[]): string[] {
  const starts: number[] = [];

  for (const rule of rules) {
    const start = parseTimeToMinutes(rule.startTime);
    const end = parseTimeToMinutes(rule.endTime);
    let current = start;

    while (current + rule.slotDuration <= end) {
      const slotStart = current;
      const slotEnd = current + rule.slotDuration;
      const overlapsBlocked = blockedRanges.some((b) => !(slotEnd <= b.start || slotStart >= b.end));
      if (!overlapsBlocked) starts.push(slotStart);
      current = slotEnd; // sin buffer: bloques contiguos según slotDuration
    }
  }

  starts.sort((a, b) => a - b);
  return starts.map(minutesToHhmm);
}

async function getRulesForDay(professionalId: string, dayOfWeek: number): Promise<DayRule[]> {
  const rules = await prisma.availability.findMany({
    where: { professionalId, dayOfWeek },
  });

  if (rules.length > 0) {
    return rules.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      slotDuration: r.slotDuration,
      bufferMinutes: r.bufferMinutes,
    }));
  }

  // Sin plantilla semanal: lun–vie usa horario por defecto para no dejar cupos vacíos.
  const anyRules = await prisma.availability.count({ where: { professionalId } });
  if (anyRules === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
    return [DEFAULT_WEEKDAY_RULE];
  }

  return [];
}

/**
 * Asegura que existan AvailabilitySlot persistidos para una fecha (Chile YYYY-MM-DD).
 * No toca slots HELD/BOOKED; solo crea los AVAILABLE faltantes.
 */
export async function ensureAvailabilitySlotsForDate(professionalId: string, ymd: string): Promise<void> {
  const dayOfWeek = jsWeekdayFromYmdChile(ymd);
  const rules = await getRulesForDay(professionalId, dayOfWeek);
  if (rules.length === 0) return;

  const dayStart = fromZonedTime(`${ymd}T00:00:00`, BOOKING_TIMEZONE);
  const dayEndExclusive = addDays(dayStart, 1);

  const blocked = await prisma.blockedSlot.findMany({ where: { professionalId } });
  const blockedForDay = blocked.filter((b) => calendarDateKeyInChile(b.date) === ymd);
  const blockedRanges = blockedForDay.map((b) => ({
    start: parseTimeToMinutes(b.startTime),
    end: parseTimeToMinutes(b.endTime),
  }));

  const desiredStarts = computeSlotStarts(rules, blockedRanges);
  if (desiredStarts.length === 0) return;

  const existing = await prisma.availabilitySlot.findMany({
    where: {
      professionalId,
      startAt: { gte: dayStart, lt: dayEndExclusive },
    },
    select: { startAt: true, status: true },
  });

  const existingStartKeys = new Set(
    existing.map((s) => formatInTimeZone(s.startAt, BOOKING_TIMEZONE, 'HH:mm')),
  );

  const toCreate = desiredStarts
    .filter((hhmm) => !existingStartKeys.has(hhmm))
    .map((hhmm) => {
      const startAt = zonedSlotStartUtc(ymd, hhmm);
      const rule = rules[0];
      const endAt = new Date(startAt.getTime() + rule.slotDuration * 60_000);
      return {
        professionalId,
        startAt,
        endAt,
        status: 'AVAILABLE' as const,
      };
    });

  if (toCreate.length > 0) {
    await prisma.availabilitySlot.createMany({ data: toCreate });
  }
}

/**
 * Regenera cupos AVAILABLE futuros (próximos `daysAhead` días) según la plantilla semanal.
 * Conserva HELD/BOOKED.
 */
export async function regenerateFutureAvailableSlots(
  professionalId: string,
  daysAhead = 21,
): Promise<void> {
  const now = new Date();
  const todayKey = calendarDateKeyInChile(now);

  await prisma.availabilitySlot.deleteMany({
    where: {
      professionalId,
      status: 'AVAILABLE',
      startAt: { gte: now },
    },
  });

  for (let i = 1; i <= daysAhead; i++) {
    const day = addDays(fromZonedTime(`${todayKey}T12:00:00`, BOOKING_TIMEZONE), i);
    const ymd = calendarDateKeyInChile(day);
    await ensureAvailabilitySlotsForDate(professionalId, ymd);
  }
}
