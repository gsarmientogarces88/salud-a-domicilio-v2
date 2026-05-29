"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScheduleForProfessional = getScheduleForProfessional;
exports.setScheduleForProfessional = setScheduleForProfessional;
exports.ensureDefaultMonFriAvailabilityIfEmpty = ensureDefaultMonFriAvailabilityIfEmpty;
exports.getAgendaSlotCandidatesRaw = getAgendaSlotCandidatesRaw;
exports.getAgendaSlotCandidatesForDate = getAgendaSlotCandidatesForDate;
exports.ensureMaterializedAgendaSlotsForDate = ensureMaterializedAgendaSlotsForDate;
exports.getAvailableSlotsForDate = getAvailableSlotsForDate;
exports.listMaterializedAgendaSlotsForDate = listMaterializedAgendaSlotsForDate;
exports.isSlotAvailable = isSlotAvailable;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const prisma_1 = __importDefault(require("../lib/prisma"));
const appointmentBookingRules_1 = require("../lib/appointmentBookingRules");
function parseTimeToMinutes(time) {
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) {
        throw new Error(`Hora inválida: ${time}`);
    }
    return h * 60 + m;
}
async function getScheduleForProfessional(professionalId) {
    const [availability, blockedSlots] = await Promise.all([
        prisma_1.default.availability.findMany({
            where: { professionalId },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        prisma_1.default.blockedSlot.findMany({
            where: { professionalId },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
    ]);
    return { availability, blockedSlots };
}
async function setScheduleForProfessional(professionalId, availability, blockedSlots) {
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
    await prisma_1.default.$transaction(async (tx) => {
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
 * Si el prestador no tiene reglas en `availabilities` (nunca abrió ajustes o seed incompleto),
 * crea lunes a viernes 09:00–18:00, 30 min, buffer 15 (misma base que /doctor settings).
 * Sin esto, GET /agenda/slots no puede generar filas a partir de `availability_slots` vacía.
 */
async function ensureDefaultMonFriAvailabilityIfEmpty(professionalId) {
    const rowsBefore = await prisma_1.default.availability.count({ where: { professionalId } });
    if (rowsBefore > 0) {
        return { filled: false, rowsBefore, rowsAfter: rowsBefore };
    }
    await prisma_1.default.availability.createMany({
        data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            professionalId,
            dayOfWeek,
            startTime: '09:00',
            endTime: '18:00',
            slotDuration: 30,
            bufferMinutes: 15,
        })),
    });
    const rowsAfter = await prisma_1.default.availability.count({ where: { professionalId } });
    return { filled: true, rowsBefore: 0, rowsAfter };
}
/**
 * Misma lógica que getAgendaSlotCandidatesForDate pero sin regla 12h / no mismo día (útil para debug y métricas).
 */
async function getAgendaSlotCandidatesRaw(professionalId, ymd) {
    await ensureDefaultMonFriAvailabilityIfEmpty(professionalId);
    const dayOfWeek = (0, appointmentBookingRules_1.jsWeekdayFromYmdChile)(ymd);
    const dayStart = (0, date_fns_tz_1.fromZonedTime)(`${ymd}T00:00:00`, appointmentBookingRules_1.BOOKING_TIMEZONE);
    const dayEndExclusive = (0, date_fns_1.addDays)(dayStart, 1);
    const now = new Date();
    const [availability, blockedSlots, existingAppointments, agendaTakenSlots] = await Promise.all([
        prisma_1.default.availability.findMany({ where: { professionalId, dayOfWeek } }),
        prisma_1.default.blockedSlot.findMany({ where: { professionalId } }),
        prisma_1.default.serviceRequest.findMany({
            where: {
                doctorId: professionalId,
                type: 'SCHEDULED',
                scheduledAt: { gte: dayStart, lt: dayEndExclusive },
                status: {
                    in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'],
                },
            },
            select: { scheduledAt: true },
        }),
        prisma_1.default.availabilitySlot.findMany({
            where: {
                professionalId,
                startAt: { gte: dayStart, lt: dayEndExclusive },
                OR: [
                    { status: 'BOOKED' },
                    { status: 'HELD', heldUntil: { gt: now } },
                ],
            },
            select: { startAt: true },
        }),
    ]);
    const blockedForDay = blockedSlots.filter((b) => (0, appointmentBookingRules_1.calendarDateKeyInChile)(b.date) === ymd);
    const occupiedMinutes = new Set();
    existingAppointments.forEach((a) => {
        if (a.scheduledAt && (0, appointmentBookingRules_1.calendarDateKeyInChile)(a.scheduledAt) === ymd) {
            const hm = (0, date_fns_tz_1.formatInTimeZone)(a.scheduledAt, appointmentBookingRules_1.BOOKING_TIMEZONE, 'HH:mm');
            occupiedMinutes.add(parseTimeToMinutes(hm));
        }
    });
    agendaTakenSlots.forEach((s) => {
        if ((0, appointmentBookingRules_1.calendarDateKeyInChile)(s.startAt) === ymd) {
            const hm = (0, date_fns_tz_1.formatInTimeZone)(s.startAt, appointmentBookingRules_1.BOOKING_TIMEZONE, 'HH:mm');
            occupiedMinutes.add(parseTimeToMinutes(hm));
        }
    });
    const blockedRanges = blockedForDay.map((b) => ({
        start: parseTimeToMinutes(b.startTime),
        end: parseTimeToMinutes(b.endTime),
    }));
    const slotStartMinutes = [];
    availability.forEach((rule) => {
        const start = parseTimeToMinutes(rule.startTime);
        const end = parseTimeToMinutes(rule.endTime);
        let current = start;
        while (current + rule.slotDuration <= end) {
            const slotStart = current;
            const slotEnd = current + rule.slotDuration;
            const overlapsBlocked = blockedRanges.some((b) => !(slotEnd <= b.start || slotStart >= b.end));
            if (!overlapsBlocked && !occupiedMinutes.has(slotStart)) {
                slotStartMinutes.push({ startMin: slotStart, durationMin: rule.slotDuration });
            }
            current = slotEnd + rule.bufferMinutes;
        }
    });
    slotStartMinutes.sort((a, b) => a.startMin - b.startMin);
    return slotStartMinutes.map(({ startMin, durationMin }) => {
        const h = Math.floor(startMin / 60)
            .toString()
            .padStart(2, '0');
        const mm = (startMin % 60).toString().padStart(2, '0');
        return { hhmm: `${h}:${mm}`, durationMin };
    });
}
/**
 * Cupos teóricos a partir de reglas semanales, bloqueos, citas (ServiceRequest) y
 * slots de agenda materializados ya reservados/en hold.
 * Aplica además: no mismo día, mínimo 12h de anticipación (Chile).
 *
 * @param ymd Fecha calendario en Chile `YYYY-MM-DD` (la misma que envía el frontend con fecha local del paciente).
 */
async function getAgendaSlotCandidatesForDate(professionalId, ymd) {
    const nowRef = new Date();
    const raw = await getAgendaSlotCandidatesRaw(professionalId, ymd);
    return raw.filter((c) => (0, appointmentBookingRules_1.evaluateBookingSlot)((0, appointmentBookingRules_1.zonedSlotStartUtc)(ymd, c.hhmm), nowRef).ok);
}
/**
 * Crea filas faltantes en `availability_slots` para que POST /agenda/requests tenga `slotId` real.
 * No pisa filas BOOKED/HELD; ajusta endAt solo en AVAILABLE (sin hold vigente) si la regla cambió.
 * Idempotente por (professionalId, startAt). Usa findFirst (no requiere @@unique en BD).
 */
async function ensureMaterializedAgendaSlotsForDate(professionalId, ymd, 
/** Si se pasan (p. ej. ya filtrados con 12h), evita otra ronda de lecturas a BD. */
precomputedCandidates) {
    const candidates = precomputedCandidates ?? (await getAgendaSlotCandidatesForDate(professionalId, ymd));
    const now = new Date();
    let newRowsCreated = 0;
    for (const c of candidates) {
        const startAt = (0, appointmentBookingRules_1.zonedSlotStartUtc)(ymd, c.hhmm);
        const endAt = (0, date_fns_1.addMinutes)(startAt, c.durationMin);
        const existing = await prisma_1.default.availabilitySlot.findFirst({
            where: { professionalId, startAt },
        });
        // eslint-disable-next-line no-console
        console.log('[AGENDA materialize] professionalId', professionalId);
        // eslint-disable-next-line no-console
        console.log('[AGENDA materialize] startAt', startAt.toISOString());
        // eslint-disable-next-line no-console
        console.log('[AGENDA materialize] slot encontrado', existing?.id ?? null);
        if (!existing) {
            try {
                await prisma_1.default.availabilitySlot.create({
                    data: { professionalId, startAt, endAt, status: 'AVAILABLE' },
                });
                newRowsCreated += 1;
            }
            catch (e) {
                if (e?.code === 'P2002')
                    continue;
                throw e;
            }
        }
        else if (existing.status === 'AVAILABLE' &&
            (existing.heldUntil == null || existing.heldUntil <= now) &&
            existing.endAt.getTime() !== endAt.getTime()) {
            await prisma_1.default.availabilitySlot.update({
                where: { id: existing.id },
                data: { endAt },
            });
        }
    }
    return { candidatesCount: candidates.length, newRowsCreated };
}
/**
 * @param ymd Fecha calendario en Chile `YYYY-MM-DD` (la misma que envía el frontend con fecha local del paciente).
 */
async function getAvailableSlotsForDate(professionalId, ymd) {
    const candidates = await getAgendaSlotCandidatesForDate(professionalId, ymd);
    return candidates.map((c) => c.hhmm);
}
/**
 * Cupos listos para reservar (filas en `availability_slots` + reglas semanales).
 * Usado por GET /agenda/slots. Genera slots faltantes de forma idempotente.
 */
async function listMaterializedAgendaSlotsForDate(professionalId, ymd, options) {
    const now = new Date();
    const dayOfWeek = (0, appointmentBookingRules_1.jsWeekdayFromYmdChile)(ymd);
    const dayStart = (0, date_fns_tz_1.fromZonedTime)(`${ymd}T00:00:00`, appointmentBookingRules_1.BOOKING_TIMEZONE);
    const dayEndExclusive = (0, date_fns_1.addDays)(dayStart, 1);
    const defaultFill = await ensureDefaultMonFriAvailabilityIfEmpty(professionalId);
    if (options?.debug && defaultFill.filled) {
        // eslint-disable-next-line no-console
        console.log('[AGENDA SLOTS] Disponibilidad L–V por defecto creada', {
            professionalId,
            rowsAfter: defaultFill.rowsAfter,
        });
    }
    const raw = await getAgendaSlotCandidatesRaw(professionalId, ymd);
    const afterRules = raw.filter((c) => (0, appointmentBookingRules_1.evaluateBookingSlot)((0, appointmentBookingRules_1.zonedSlotStartUtc)(ymd, c.hhmm), now).ok);
    const { newRowsCreated } = await ensureMaterializedAgendaSlotsForDate(professionalId, ymd, afterRules);
    const dbSlots = await prisma_1.default.availabilitySlot.findMany({
        where: {
            professionalId,
            startAt: { gte: dayStart, lt: dayEndExclusive },
            status: 'AVAILABLE',
            OR: [{ heldUntil: null }, { heldUntil: { gt: now } }],
        },
        orderBy: { startAt: 'asc' },
    });
    const allowed = dbSlots.filter((s) => (0, appointmentBookingRules_1.evaluateBookingSlot)(s.startAt, now).ok);
    if (options?.debug) {
        // eslint-disable-next-line no-console
        console.log('[AGENDA SLOTS] listMaterializedAgendaSlotsForDate', {
            professionalId,
            ymd,
            dayOfWeekChile: dayOfWeek,
            rawCandidates: raw.length,
            afterBookingRules: afterRules.length,
            newMaterializedRows: newRowsCreated,
            dbAvailableBeforeFilter: dbSlots.length,
            finalReturned: allowed.length,
            sampleRaw: raw.slice(0, 6).map((c) => c.hhmm),
            sampleFinal: allowed.slice(0, 6).map((s) => (0, date_fns_tz_1.formatInTimeZone)(s.startAt, appointmentBookingRules_1.BOOKING_TIMEZONE, 'yyyy-MM-dd HH:mm')),
        });
    }
    return {
        slots: allowed.map((s) => ({ id: s.id, startAt: s.startAt, endAt: s.endAt })),
        debug: {
            dayOfWeekChile: dayOfWeek,
            rawCandidates: raw.length,
            afterBookingRules: afterRules.length,
            newMaterializedRows: newRowsCreated,
            dbAvailableBeforeFilter: dbSlots.length,
        },
    };
}
async function isSlotAvailable(professionalId, dateTime) {
    const ymd = (0, appointmentBookingRules_1.calendarDateKeyInChile)(dateTime);
    const time = (0, date_fns_tz_1.formatInTimeZone)(dateTime, appointmentBookingRules_1.BOOKING_TIMEZONE, 'HH:mm');
    const slots = await getAvailableSlotsForDate(professionalId, ymd);
    return slots.includes(time);
}
