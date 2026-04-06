import { ServiceStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import prisma from '../lib/prisma';
import {
  BOOKING_TIMEZONE,
  calendarDateKeyInChile,
  evaluateBookingSlot,
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

export async function getScheduleForProfessional(professionalId: string) {
  const [availability, blockedSlots] = await Promise.all([
    prisma.availability.findMany({
      where: { professionalId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.blockedSlot.findMany({
      where: { professionalId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
  ]);

  return { availability, blockedSlots };
}

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  bufferMinutes: number;
}

interface BlockedSlotInput {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export async function setScheduleForProfessional(
  professionalId: string,
  availability: AvailabilityInput[],
  blockedSlots: BlockedSlotInput[],
) {
  availability.forEach((a) => {
    if (a.dayOfWeek < 0 || a.dayOfWeek > 6) {
      throw new Error('dayOfWeek debe estar entre 0 (Domingo) y 6 (Sábado)');
    }
    const start = parseTimeToMinutes(a.startTime);
    const end = parseTimeToMinutes(a.endTime);
    if (end <= start) {
      throw new Error('La hora de término debe ser posterior a la de inicio');
    }
    if (a.slotDuration <= 0) {
      throw new Error('slotDuration debe ser mayor que 0');
    }
    if (a.bufferMinutes < 0) {
      throw new Error('bufferMinutes no puede ser negativo');
    }
  });

  blockedSlots.forEach((b) => {
    const start = parseTimeToMinutes(b.startTime);
    const end = parseTimeToMinutes(b.endTime);
    if (end <= start) {
      throw new Error('En los bloques bloqueados, la hora de término debe ser posterior a la de inicio');
    }
    if (!b.date) {
      throw new Error('date es requerido en bloques bloqueados');
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { professionalId } });
    await tx.blockedSlot.deleteMany({ where: { professionalId } });

    if (availability.length > 0) {
      await tx.availability.createMany({
        data: availability.map((a) => ({
          professionalId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          slotDuration: a.slotDuration,
          bufferMinutes: a.bufferMinutes,
        })),
      });
    }

    if (blockedSlots.length > 0) {
      await tx.blockedSlot.createMany({
        data: blockedSlots.map((b) => ({
          professionalId,
          date: new Date(b.date),
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason,
        })),
      });
    }
  });

  return getScheduleForProfessional(professionalId);
}

/**
 * @param ymd Fecha calendario en Chile `YYYY-MM-DD` (la misma que envía el frontend con fecha local del paciente).
 */
export async function getAvailableSlotsForDate(professionalId: string, ymd: string): Promise<string[]> {
  const dayOfWeek = jsWeekdayFromYmdChile(ymd);
  const dayStart = fromZonedTime(`${ymd}T00:00:00`, BOOKING_TIMEZONE);
  const dayEndExclusive = addDays(dayStart, 1);

  const [availability, blockedSlots, existingAppointments] = await Promise.all([
    prisma.availability.findMany({ where: { professionalId, dayOfWeek } }),
    prisma.blockedSlot.findMany({ where: { professionalId } }),
    prisma.serviceRequest.findMany({
      where: {
        doctorId: professionalId,
        type: 'SCHEDULED',
        scheduledAt: { gte: dayStart, lt: dayEndExclusive },
        status: {
          in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] as ServiceStatus[],
        },
      },
      select: { scheduledAt: true },
    }),
  ]);

  const blockedForDay = blockedSlots.filter((b) => calendarDateKeyInChile(b.date) === ymd);

  const occupiedMinutes = new Set<number>();
  existingAppointments.forEach((a) => {
    if (a.scheduledAt && calendarDateKeyInChile(a.scheduledAt) === ymd) {
      const hm = formatInTimeZone(a.scheduledAt, BOOKING_TIMEZONE, 'HH:mm');
      occupiedMinutes.add(parseTimeToMinutes(hm));
    }
  });

  const blockedRanges = blockedForDay.map((b) => ({
    start: parseTimeToMinutes(b.startTime),
    end: parseTimeToMinutes(b.endTime),
  }));

  const slots: number[] = [];
  const now = new Date();

  availability.forEach((rule) => {
    const start = parseTimeToMinutes(rule.startTime);
    const end = parseTimeToMinutes(rule.endTime);
    let current = start;

    while (current + rule.slotDuration <= end) {
      const slotStart = current;
      const slotEnd = current + rule.slotDuration;

      const overlapsBlocked = blockedRanges.some((b) => !(slotEnd <= b.start || slotStart >= b.end));
      if (!overlapsBlocked && !occupiedMinutes.has(slotStart)) {
        slots.push(slotStart);
      }

      current = slotEnd + rule.bufferMinutes;
    }
  });

  slots.sort((a, b) => a - b);
  const timeStrings = slots.map((m) => {
    const h = Math.floor(m / 60)
      .toString()
      .padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    return `${h}:${mm}`;
  });

  return timeStrings.filter((t) => evaluateBookingSlot(zonedSlotStartUtc(ymd, t), now).ok);
}

export async function isSlotAvailable(professionalId: string, dateTime: Date): Promise<boolean> {
  const ymd = calendarDateKeyInChile(dateTime);
  const time = formatInTimeZone(dateTime, BOOKING_TIMEZONE, 'HH:mm');
  const slots = await getAvailableSlotsForDate(professionalId, ymd);
  return slots.includes(time);
}
