"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequest = createRequest;
exports.acceptRequest = acceptRequest;
exports.startRequest = startRequest;
exports.completeRequest = completeRequest;
exports.cancelRequest = cancelRequest;
exports.cancelByDoctor = cancelByDoctor;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Transiciones válidas
const TRANSITIONS = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
    REFUNDED: [],
};
function canTransition(from, to) {
    return TRANSITIONS[from]?.includes(to) ?? false;
}
// Obtener config de plataforma
async function getConfig() {
    const cfg = await prisma_1.default.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
    return {
        pendingTimeoutSec: cfg?.pendingTimeoutSec ?? 240,
        percentage: cfg?.percentage ?? 20,
        urgentFixedFee: cfg?.urgentFixedFee ?? 35000,
        maxCancellations: cfg?.maxCancellations ?? 3,
    };
}
// Crear solicitud
async function createRequest(data) {
    const cfg = await getConfig();
    const now = new Date();
    // URGENT: darle una ventana mayor para que aparezca en el feed y permita matching.
    // SCHEDULED: mantenemos el timeout configurable.
    const urgentTtlSec = 30 * 60;
    const ttlSec = data.type === 'URGENT' ? urgentTtlSec : cfg.pendingTimeoutSec;
    const expiresAt = new Date(now.getTime() + ttlSec * 1000);
    let totalAmount;
    let urgentFixedPrice = null;
    if (data.type === 'URGENT') {
        totalAmount = cfg.urgentFixedFee;
        urgentFixedPrice = cfg.urgentFixedFee;
    }
    else {
        if (data.doctorId) {
            const doc = await prisma_1.default.doctorProfile.findUnique({ where: { id: data.doctorId } });
            if (!doc || !doc.isVerified || !doc.isAvailable)
                throw new Error('Médico no disponible');
            totalAmount = doc.baseFee;
        }
        else {
            // Para reservas SCHEDULED sin profesional asignado todavía usamos una tarifa base
            // configurable (por ahora reutilizamos urgentFixedFee como valor de referencia).
            totalAmount = cfg.urgentFixedFee;
        }
    }
    const commissionAmount = Math.round(totalAmount * (cfg.percentage / 100));
    const doctorNetAmount = totalAmount - commissionAmount;
    return prisma_1.default.serviceRequest.create({
        data: {
            patientId: data.patientId,
            doctorId: data.type === 'SCHEDULED' ? data.doctorId : null,
            type: data.type,
            status: 'PENDING',
            description: data.description,
            address: data.address,
            commune: data.commune,
            city: data.city,
            region: data.region,
            referencias: data.referencias,
            sexo: data.sexo,
            telefono: data.telefono,
            edadPaciente: data.edadPaciente,
            esMenorEdad: data.esMenorEdad ?? false,
            tieneFiebre: data.tieneFiebre,
            dificultadRespiratoria: data.dificultadRespiratoria,
            totalAmount,
            commissionAmount,
            doctorNetAmount,
            urgentFixedPrice,
            scheduledAt: data.scheduledAt,
            expiresAt,
        },
    });
}
// Médico acepta solicitud
async function acceptRequest(serviceId, doctorId) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (!canTransition(sr.status, 'ACCEPTED'))
        throw new Error(`No se puede aceptar desde ${sr.status}`);
    if (sr.expiresAt && sr.expiresAt < new Date())
        throw new Error('Solicitud expirada');
    if (sr.doctorId && sr.doctorId !== doctorId)
        throw new Error('Solicitud ya asignada a otro médico');
    const doc = await prisma_1.default.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doc || !doc.isVerified)
        throw new Error('Médico no verificado');
    const rejected = await prisma_1.default.serviceRequestRejection.findUnique({
        where: { serviceRequestId_doctorId: { serviceRequestId: serviceId, doctorId } },
        select: { id: true },
    });
    if (rejected)
        throw new Error('Ya rechazaste esta solicitud');
    // Si es URGENT, recalcular montos con tarifa fija
    const cfg = await getConfig();
    const totalAmount = sr.type === 'URGENT' ? cfg.urgentFixedFee : sr.totalAmount;
    const commissionAmount = Math.round(totalAmount * (cfg.percentage / 100));
    return prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: {
            status: 'ACCEPTED',
            doctorId,
            totalAmount,
            commissionAmount,
            doctorNetAmount: totalAmount - commissionAmount,
        },
    });
}
// Iniciar atención
async function startRequest(serviceId, doctorId) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.doctorId !== doctorId)
        throw new Error('No es tu solicitud');
    if (!canTransition(sr.status, 'IN_PROGRESS'))
        throw new Error(`No se puede iniciar desde ${sr.status}`);
    return prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
}
// Completar atención
async function completeRequest(serviceId, doctorId, notes) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.doctorId !== doctorId)
        throw new Error('No es tu solicitud');
    if (!canTransition(sr.status, 'COMPLETED'))
        throw new Error(`No se puede completar desde ${sr.status}`);
    return prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'COMPLETED', completedAt: new Date(), notes },
    });
}
// Cancelar (solo desde PENDING)
async function cancelRequest(serviceId, userId, reason) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (!canTransition(sr.status, 'CANCELLED'))
        throw new Error('No se permite cancelar en este estado');
    const cfg = await getConfig();
    // Incrementar contador y banear si excede
    const user = await prisma_1.default.user.update({
        where: { id: userId },
        data: { cancellationCount: { increment: 1 } },
    });
    if (user.cancellationCount >= cfg.maxCancellations) {
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { isBanned: true, banReason: 'Exceso de cancelaciones' },
        });
    }
    return prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
}
// Cancelar por parte del profesional (no penaliza al paciente)
async function cancelByDoctor(serviceId, doctorId, reason) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.doctorId !== doctorId)
        throw new Error('Solo el profesional asignado puede cancelar la cita');
    if (!canTransition(sr.status, 'CANCELLED'))
        throw new Error('No se permite cancelar en este estado');
    return prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
}
