"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScheduleForProfessional = getScheduleForProfessional;
exports.setScheduleForProfessional = setScheduleForProfessional;
exports.getAvailableSlotsForDate = getAvailableSlotsForDate;
exports.isSlotAvailable = isSlotAvailable;
const prisma_1 = __importDefault(require("../lib/prisma"));
function parseTimeToMinutes(time) {
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) {
        throw new Error(`Hora inválida: ${time}`);
    }
    return h * 60 + m;
}
function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    // Validaciones mínimas
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
async function getAvailableSlotsForDate(professionalId, date) {
    const dayOfWeek = date.getDay(); // 0-6
    const [availability, blockedSlots, existingAppointments] = await Promise.all([
        prisma_1.default.availability.findMany({ where: { professionalId, dayOfWeek } }),
        prisma_1.default.blockedSlot.findMany({
            where: {
                professionalId,
                date: {
                    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                },
            },
        }),
        prisma_1.default.serviceRequest.findMany({
            where: {
                doctorId: professionalId,
                type: 'SCHEDULED',
                scheduledAt: {
                    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                },
                status: {
                    in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'],
                },
            },
            select: { scheduledAt: true },
        }),
    ]);
    const occupiedMinutes = new Set();
    existingAppointments.forEach((a) => {
        if (a.scheduledAt && sameDate(a.scheduledAt, date)) {
            const m = a.scheduledAt.getHours() * 60 + a.scheduledAt.getMinutes();
            occupiedMinutes.add(m);
        }
    });
    const blockedRanges = blockedSlots.map((b) => ({
        start: parseTimeToMinutes(b.startTime),
        end: parseTimeToMinutes(b.endTime),
    }));
    const slots = [];
    availability.forEach((rule) => {
        const start = parseTimeToMinutes(rule.startTime);
        const end = parseTimeToMinutes(rule.endTime);
        let current = start;
        while (current + rule.slotDuration <= end) {
            const slotStart = current;
            const slotEnd = current + rule.slotDuration;
            // Verificar bloqueos
            const overlapsBlocked = blockedRanges.some((b) => !(slotEnd <= b.start || slotStart >= b.end));
            if (!overlapsBlocked && !occupiedMinutes.has(slotStart)) {
                slots.push(slotStart);
            }
            current = slotEnd + rule.bufferMinutes;
        }
    });
    // Ordenar y convertir a "HH:MM"
    slots.sort((a, b) => a - b);
    return slots.map((m) => {
        const h = Math.floor(m / 60)
            .toString()
            .padStart(2, '0');
        const mm = (m % 60).toString().padStart(2, '0');
        return `${h}:${mm}`;
    });
}
async function isSlotAvailable(professionalId, dateTime) {
    const date = new Date(dateTime);
    date.setHours(0, 0, 0, 0);
    const time = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    const slots = await getAvailableSlotsForDate(professionalId, date);
    return slots.includes(time);
}
