"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_CANCELLED_QUEUED_TIMEOUT_MARKER = exports.AUTO_CANCELLED_ACCEPTED_TIMEOUT_MARKER = exports.AUTO_COMPLETED_IN_PROGRESS_MARKER = void 0;
exports.createRequest = createRequest;
exports.acceptRequest = acceptRequest;
exports.startRequest = startRequest;
exports.completeRequest = completeRequest;
exports.autoCompleteStaleInProgressServices = autoCompleteStaleInProgressServices;
exports.cancelRequest = cancelRequest;
exports.cancelByDoctor = cancelByDoctor;
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../config");
/** Prefijo en `notes` para cierres automáticos por tiempo en IN_PROGRESS (auditoría / soporte). */
exports.AUTO_COMPLETED_IN_PROGRESS_MARKER = '[AUTO_COMPLETED_TIMEOUT]';
const AUTO_COMPLETED_IN_PROGRESS_NOTE = `${exports.AUTO_COMPLETED_IN_PROGRESS_MARKER} Atención cerrada automáticamente por tiempo (límite de atención en curso).`;
/** Prefijos históricos en cancelReason/notes si en el pasado hubo autocancelación; el job ya no las aplica. */
exports.AUTO_CANCELLED_ACCEPTED_TIMEOUT_MARKER = '[AUTO_CANCELLED_ACCEPTED_TIMEOUT]';
exports.AUTO_CANCELLED_QUEUED_TIMEOUT_MARKER = '[AUTO_CANCELLED_QUEUED_TIMEOUT]';
async function promoteNextQueuedAfterComplete(db, doctorId, now) {
    const next = await db.serviceRequest.findFirst({
        where: { doctorId, status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });
    if (!next)
        return;
    const promoted = await db.serviceRequest.update({
        where: { id: next.id },
        data: { status: 'IN_PROGRESS', startedAt: now, queuedAt: null, acceptedAt: null },
    });
    if (config_1.config.isDev || config_1.config.debugServiceStateFlow) {
        // eslint-disable-next-line no-console
        console.log('[serviceFlow.promoteQueued]', {
            promotedId: next.id,
            doctorId,
            promotedStatus: promoted.status,
            startedAt: promoted.startedAt,
        });
    }
}
class OpenServiceExistsError extends Error {
    constructor(openService) {
        super('Ya tienes una atención en curso o pendiente. Debes finalizar o cerrar la actual antes de solicitar otra.');
        this.code = 'OPEN_SERVICE_EXISTS';
        this.openService = openService;
    }
}
// Transiciones válidas
const TRANSITIONS = {
    PENDING: ['CANCELLED'],
    QUEUED: ['IN_PROGRESS', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'CANCELLED'], // legacy + cancelación médico/sistema
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
    // Regla: paciente no puede tener más de una atención abierta
    const nowForValidation = new Date();
    const openExisting = await prisma_1.default.serviceRequest.findFirst({
        where: {
            patientId: data.patientId,
            OR: [
                { status: 'QUEUED' },
                { status: 'ACCEPTED' },
                { status: 'IN_PROGRESS' },
                {
                    status: 'PENDING',
                    OR: [{ expiresAt: null }, { expiresAt: { gt: nowForValidation } }],
                },
            ],
        },
        select: {
            id: true,
            status: true,
            createdAt: true,
            doctor: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (openExisting) {
        const doctorName = openExisting.doctor?.user
            ? `${openExisting.doctor.user.firstName} ${openExisting.doctor.user.lastName}`
            : null;
        throw new OpenServiceExistsError({
            id: openExisting.id,
            status: openExisting.status,
            createdAt: openExisting.createdAt,
            doctorName,
        });
    }
    const cfg = await getConfig();
    const now = new Date();
    const rawTtlMin = data.type === 'URGENT'
        ? config_1.config.serviceRequests.urgentPendingTtlMinutes
        : config_1.config.serviceRequests.scheduledPendingTtlMinutes;
    const ttlMin = Number.isFinite(rawTtlMin) ? Math.max(1, rawTtlMin) : 10;
    const expiresAt = new Date(now.getTime() + ttlMin * 60 * 1000);
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
    const province = data.province ?? data.city;
    return prisma_1.default.serviceRequest.create({
        data: {
            patientId: data.patientId,
            doctorId: data.type === 'SCHEDULED' ? data.doctorId : null,
            type: data.type,
            status: 'PENDING',
            description: data.description,
            address: data.address,
            commune: data.commune,
            province,
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
    if (sr.status !== 'PENDING')
        throw new Error(`No se puede aceptar desde ${sr.status}`);
    if (sr.expiresAt && sr.expiresAt < new Date())
        throw new Error('Solicitud expirada');
    if (sr.doctorId && sr.doctorId !== doctorId)
        throw new Error('Solicitud ya asignada a otro médico');
    if (config_1.config.isDev) {
        // eslint-disable-next-line no-console
        console.log('[services.accept] attempt:', { serviceId, doctorId, status: sr.status, createdAt: sr.createdAt, expiresAt: sr.expiresAt });
    }
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
    // Regla prestador: 1 activo (IN_PROGRESS) + 1 en cola (QUEUED)
    const [active, queued] = await Promise.all([
        prisma_1.default.serviceRequest.findFirst({
            where: { doctorId, status: 'IN_PROGRESS' },
            select: { id: true },
            orderBy: { startedAt: 'desc' },
        }),
        prisma_1.default.serviceRequest.findFirst({
            where: { doctorId, status: 'QUEUED' },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        }),
    ]);
    if (active && queued) {
        throw new Error('Ya tienes una atención activa y otra en espera. Finaliza una antes de aceptar otra.');
    }
    const nextStatus = active ? 'QUEUED' : 'IN_PROGRESS';
    const nowAccept = new Date();
    const startedAt = active ? undefined : nowAccept;
    const updated = await prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: {
            status: nextStatus,
            doctorId,
            totalAmount,
            commissionAmount,
            doctorNetAmount: totalAmount - commissionAmount,
            /** Evita que clientes o reportes interpreten el TTL de PENDING tras asignar médico. */
            expiresAt: null,
            ...(nextStatus === 'QUEUED'
                ? { queuedAt: nowAccept, acceptedAt: null, startedAt: null }
                : { startedAt: startedAt, queuedAt: null, acceptedAt: null }),
        },
    });
    if (config_1.config.isDev) {
        // eslint-disable-next-line no-console
        console.log('[services.accept] updated:', {
            serviceId,
            doctorId,
            nextStatus,
            activeServiceId: active?.id ?? null,
            queuedServiceId: queued?.id ?? null,
        });
    }
    return updated;
}
// Iniciar atención
async function startRequest(serviceId, doctorId) {
    const dbg = config_1.config.debugServiceStateFlow;
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.doctorId !== doctorId)
        throw new Error('No es tu solicitud');
    if (dbg) {
        // eslint-disable-next-line no-console
        console.log('[serviceFlow.start]', { serviceId, doctorId, beforeStatus: sr.status });
    }
    if (!canTransition(sr.status, 'IN_PROGRESS'))
        throw new Error(`No se puede iniciar desde ${sr.status}`);
    if (sr.status === 'QUEUED') {
        const otherActive = await prisma_1.default.serviceRequest.findFirst({
            where: { doctorId, status: 'IN_PROGRESS', id: { not: serviceId } },
            select: { id: true },
        });
        if (otherActive) {
            throw new Error('Finaliza la atención en curso antes de iniciar la que está en cola.');
        }
    }
    const updated = await prisma_1.default.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), queuedAt: null, acceptedAt: null },
    });
    if (dbg) {
        // eslint-disable-next-line no-console
        console.log('[serviceFlow.start]', { serviceId, afterStatus: updated.status, startedAt: updated.startedAt });
    }
    return updated;
}
// Completar atención
async function completeRequest(serviceId, doctorId, notes) {
    const dbg = config_1.config.debugServiceStateFlow;
    return prisma_1.default.$transaction(async (tx) => {
        const sr = await tx.serviceRequest.findUnique({ where: { id: serviceId } });
        if (!sr)
            throw new Error('Solicitud no encontrada');
        if (sr.doctorId !== doctorId)
            throw new Error('No es tu solicitud');
        if (dbg) {
            // eslint-disable-next-line no-console
            console.log('[serviceFlow.complete]', { serviceId, doctorId, beforeStatus: sr.status });
        }
        if (!canTransition(sr.status, 'COMPLETED'))
            throw new Error(`No se puede completar desde ${sr.status}`);
        const now = new Date();
        const updatePayload = {
            status: 'COMPLETED',
            completedAt: now,
        };
        if (notes !== undefined)
            updatePayload.notes = notes;
        const completed = await tx.serviceRequest.update({
            where: { id: serviceId },
            data: updatePayload,
        });
        if (dbg) {
            // eslint-disable-next-line no-console
            console.log('[serviceFlow.complete]', {
                serviceId,
                afterStatus: completed.status,
                completedAt: completed.completedAt,
            });
        }
        await promoteNextQueuedAfterComplete(tx, doctorId, now);
        if (dbg) {
            const inProg = await tx.serviceRequest.findMany({
                where: { doctorId, status: 'IN_PROGRESS' },
                select: { id: true, startedAt: true },
                orderBy: { startedAt: 'desc' },
            });
            const queued = await tx.serviceRequest.findMany({
                where: { doctorId, status: 'QUEUED' },
                select: { id: true },
                orderBy: { createdAt: 'asc' },
            });
            // eslint-disable-next-line no-console
            console.log('[serviceFlow.complete.afterPromote]', {
                doctorId,
                closedServiceId: serviceId,
                inProgress: inProg.map((r) => ({ id: r.id, startedAt: r.startedAt })),
                queuedIds: queued.map((r) => r.id),
            });
        }
        return completed;
    });
}
/**
 * Cierra IN_PROGRESS que superaron el límite desde `startedAt` (no usa createdAt).
 * Idempotente: `updateMany` con status IN_PROGRESS evita doble cierre si el médico ya finalizó.
 * También promueve QUEUED igual que un cierre manual.
 */
async function autoCompleteStaleInProgressServices() {
    const maxMin = Number.isFinite(config_1.config.serviceRequests.inProgressAutoCompleteAfterMinutes)
        ? Math.max(1, config_1.config.serviceRequests.inProgressAutoCompleteAfterMinutes)
        : 100;
    const cutoff = new Date(Date.now() - maxMin * 60 * 1000);
    const stale = await prisma_1.default.serviceRequest.findMany({
        where: {
            status: 'IN_PROGRESS',
            startedAt: { not: null, lte: cutoff },
        },
        select: { id: true },
    });
    let closed = 0;
    for (const row of stale) {
        const did = await prisma_1.default.$transaction(async (tx) => {
            const cur = await tx.serviceRequest.findFirst({
                where: {
                    id: row.id,
                    status: 'IN_PROGRESS',
                    startedAt: { not: null, lte: cutoff },
                },
                select: { id: true, doctorId: true, notes: true },
            });
            if (!cur?.doctorId)
                return false;
            const newNotes = cur.notes?.includes(exports.AUTO_COMPLETED_IN_PROGRESS_MARKER)
                ? cur.notes
                : cur.notes?.trim()
                    ? `${cur.notes.trim()}\n\n${AUTO_COMPLETED_IN_PROGRESS_NOTE}`
                    : AUTO_COMPLETED_IN_PROGRESS_NOTE;
            const upd = await tx.serviceRequest.updateMany({
                where: {
                    id: cur.id,
                    status: 'IN_PROGRESS',
                    startedAt: { lte: cutoff },
                },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    notes: newNotes,
                },
            });
            if (upd.count === 0)
                return false;
            await promoteNextQueuedAfterComplete(tx, cur.doctorId, new Date());
            return true;
        });
        if (did)
            closed += 1;
    }
    if (closed > 0 && config_1.config.isDev) {
        // eslint-disable-next-line no-console
        console.log('[services.autoCompleteInProgress]', { closed, cutoff: cutoff.toISOString() });
    }
    return closed;
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
