"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPendingTimeoutJob = startPendingTimeoutJob;
exports.stopPendingTimeoutJob = stopPendingTimeoutJob;
const prisma_1 = __importDefault(require("../lib/prisma"));
const INTERVAL_MS = 10000; // cada 10 segundos
async function expirePendingRequests() {
    try {
        const now = new Date();
        const expired = await prisma_1.default.serviceRequest.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: now },
            },
            data: {
                status: 'CANCELLED',
                cancelledAt: now,
                cancelReason: 'No hay médicos disponibles en su sector en este momento.',
            },
        });
        if (expired.count > 0) {
            console.log(`[TIMEOUT] ${expired.count} solicitud(es) expirada(s)`);
        }
        // TODO Fase 2: notificar pacientes afectados
    }
    catch (err) {
        console.error('[TIMEOUT] Error:', err);
    }
}
let timer = null;
function startPendingTimeoutJob() {
    if (timer)
        return;
    console.log(`[TIMEOUT] Job iniciado (cada ${INTERVAL_MS / 1000}s)`);
    timer = setInterval(expirePendingRequests, INTERVAL_MS);
    // Ejecutar inmediatamente la primera vez
    expirePendingRequests();
}
function stopPendingTimeoutJob() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[TIMEOUT] Job detenido');
    }
}
