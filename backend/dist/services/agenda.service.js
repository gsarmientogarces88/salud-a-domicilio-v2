"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAddressForProfessional = validateAddressForProfessional;
exports.createAppointmentRequest = createAppointmentRequest;
exports.acceptAppointmentRequest = acceptAppointmentRequest;
exports.rejectAppointmentRequest = rejectAppointmentRequest;
exports.expireHeldRequests = expireHeldRequests;
const prisma_1 = __importDefault(require("../lib/prisma"));
const haversine_1 = require("../lib/haversine");
const HOLD_MINUTES = 20;
function getHoldUntil() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + HOLD_MINUTES);
    return d;
}
/**
 * Valida que la dirección esté dentro de cobertura y no en zona excluida.
 * @returns { valid: boolean, error?: string }
 */
function validateAddressForProfessional(professional, lat, lng, commune) {
    const excluded = professional.excludedZones || [];
    const communeNorm = commune.trim().toLowerCase();
    if (excluded.some((z) => z.trim().toLowerCase() === communeNorm)) {
        return { valid: false, error: 'Zona no atendida por el profesional.' };
    }
    const baseLat = professional.baseLat;
    const baseLng = professional.baseLng;
    const coverageKm = professional.coverageKm ?? 15;
    if (baseLat == null || baseLng == null) {
        // Sin coordenadas base: aceptar por defecto (MVP)
        return { valid: true };
    }
    const km = (0, haversine_1.haversineDistance)(baseLat, baseLng, lat, lng);
    if (km > coverageKm) {
        return {
            valid: false,
            error: `Este profesional atiende hasta ${coverageKm} km desde su base. Elige otro profesional.`,
        };
    }
    return { valid: true };
}
async function createAppointmentRequest(data) {
    const { patientId, professionalId, slotId, addressText, region, city, commune, lat, lng, notes } = data;
    const [professional, slot] = await Promise.all([
        prisma_1.default.doctorProfile.findUnique({ where: { id: professionalId } }),
        prisma_1.default.availabilitySlot.findUnique({ where: { id: slotId }, include: { professional: true } }),
    ]);
    if (!professional)
        throw new Error('Profesional no encontrado');
    if (!slot)
        throw new Error('Slot no encontrado');
    if (slot.professionalId !== professionalId)
        throw new Error('Slot no pertenece al profesional');
    if (slot.status !== 'AVAILABLE')
        throw new Error('El horario ya no está disponible');
    const validation = validateAddressForProfessional(professional, lat, lng, commune);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    const holdUntil = getHoldUntil();
    const amount = professional.baseFee;
    const result = await prisma_1.default.$transaction(async (tx) => {
        await tx.availabilitySlot.update({
            where: { id: slotId },
            data: { status: 'HELD', heldUntil: holdUntil },
        });
        const request = await tx.appointmentRequest.create({
            data: {
                patientId,
                professionalId,
                slotId,
                addressText,
                region,
                city,
                commune,
                lat,
                lng,
                notes,
                status: 'PENDING_PRO_CONFIRMATION',
            },
        });
        await tx.appointmentPayment.create({
            data: {
                appointmentRequestId: request.id,
                amount,
                currency: 'CLP',
                provider: 'simulated',
                providerIntentId: `intent_${request.id}_${Date.now()}`,
                status: 'HOLD',
            },
        });
        return request;
    });
    console.log(`[AGENDA] Solicitud creada: ${result.id}, slot ${slotId} HELD hasta ${holdUntil.toISOString()}`);
    return result;
}
async function acceptAppointmentRequest(requestId, professionalId) {
    const request = await prisma_1.default.appointmentRequest.findUnique({
        where: { id: requestId },
        include: { slot: true, payment: true },
    });
    if (!request)
        throw new Error('Solicitud no encontrada');
    if (request.professionalId !== professionalId)
        throw new Error('No puedes aceptar esta solicitud');
    if (request.status !== 'PENDING_PRO_CONFIRMATION') {
        throw new Error(`Solicitud en estado ${request.status}, no puede aceptarse`);
    }
    if (request.slot.status !== 'HELD')
        throw new Error('El slot ya no está en hold');
    if (request.slot.heldUntil && request.slot.heldUntil < new Date()) {
        throw new Error('El hold del slot ha expirado');
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.appointmentPayment.update({
            where: { appointmentRequestId: requestId },
            data: { status: 'CAPTURED' },
        });
        await tx.appointmentRequest.update({
            where: { id: requestId },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
        await tx.availabilitySlot.update({
            where: { id: request.slotId },
            data: { status: 'BOOKED', heldUntil: null },
        });
    });
    console.log(`[AGENDA] Solicitud aceptada: ${requestId}`);
}
async function rejectAppointmentRequest(requestId, professionalId, reason, comment) {
    const request = await prisma_1.default.appointmentRequest.findUnique({
        where: { id: requestId },
        include: { slot: true },
    });
    if (!request)
        throw new Error('Solicitud no encontrada');
    if (request.professionalId !== professionalId)
        throw new Error('No puedes rechazar esta solicitud');
    if (request.status !== 'PENDING_PRO_CONFIRMATION') {
        throw new Error(`Solicitud en estado ${request.status}`);
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.appointmentPayment.updateMany({
            where: { appointmentRequestId: requestId },
            data: { status: 'CANCELED' },
        });
        await tx.appointmentRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectReason: reason,
                rejectComment: comment,
            },
        });
        await tx.availabilitySlot.update({
            where: { id: request.slotId },
            data: { status: 'AVAILABLE', heldUntil: null },
        });
    });
    console.log(`[AGENDA] Solicitud rechazada: ${requestId}, razón: ${reason}`);
}
async function expireHeldRequests() {
    const now = new Date();
    const expired = await prisma_1.default.appointmentRequest.findMany({
        where: {
            status: 'PENDING_PRO_CONFIRMATION',
            slot: {
                heldUntil: { lt: now },
            },
        },
        include: { slot: true },
    });
    for (const req of expired) {
        try {
            await prisma_1.default.$transaction(async (tx) => {
                await tx.appointmentPayment.updateMany({
                    where: { appointmentRequestId: req.id },
                    data: { status: 'CANCELED' },
                });
                await tx.appointmentRequest.update({
                    where: { id: req.id },
                    data: { status: 'EXPIRED', expiredAt: now },
                });
                await tx.availabilitySlot.update({
                    where: { id: req.slotId },
                    data: { status: 'AVAILABLE', heldUntil: null },
                });
            });
            console.log(`[AGENDA] Solicitud expirada: ${req.id}`);
        }
        catch (e) {
            console.error(`[AGENDA] Error al expirar ${req.id}:`, e);
        }
    }
    return expired.length;
}
