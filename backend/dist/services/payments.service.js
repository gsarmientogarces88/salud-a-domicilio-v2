"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAmounts = calculateAmounts;
exports.createTransaction = createTransaction;
exports.markAsPaid = markAsPaid;
exports.refund = refund;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Obtener % comisión vigente
async function getCommissionPercentage() {
    const cfg = await prisma_1.default.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
    return cfg?.percentage ?? 20;
}
// Calcular desglose de montos
function calculateAmounts(totalAmount, commissionPercentage) {
    const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
    const doctorNetAmount = totalAmount - commissionAmount;
    return { totalAmount, commissionPercentage, commissionAmount, doctorNetAmount };
}
// Crear transacción asociada a un serviceRequest
async function createTransaction(serviceRequestId, provider, amount, providerRef) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceRequestId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.status !== 'ACCEPTED')
        throw new Error('Solo se puede pagar en estado ACCEPTED');
    return prisma_1.default.transaction.create({
        data: {
            serviceRequestId,
            provider,
            providerRef: providerRef ?? null,
            amount,
            status: 'PENDING',
        },
    });
}
// Marcar como pagado: actualiza transacción + recalcula montos en serviceRequest
async function markAsPaid(serviceRequestId, providerRef) {
    const sr = await prisma_1.default.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        include: { transactions: { where: { status: 'PENDING' }, take: 1 } },
    });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.status !== 'ACCEPTED')
        throw new Error('Solo se puede pagar en estado ACCEPTED');
    const tx = sr.transactions[0];
    if (!tx)
        throw new Error('No hay transacción pendiente');
    const pct = await getCommissionPercentage();
    const amounts = calculateAmounts(sr.totalAmount, pct);
    return prisma_1.default.$transaction([
        // Marcar transacción como completada
        prisma_1.default.transaction.update({
            where: { id: tx.id },
            data: {
                status: 'COMPLETED',
                providerRef: providerRef ?? tx.providerRef,
            },
        }),
        // Actualizar montos en serviceRequest
        prisma_1.default.serviceRequest.update({
            where: { id: serviceRequestId },
            data: {
                commissionAmount: amounts.commissionAmount,
                doctorNetAmount: amounts.doctorNetAmount,
            },
        }),
    ]);
}
// Placeholder: procesar reembolso
async function refund(serviceRequestId) {
    const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: serviceRequestId } });
    if (!sr)
        throw new Error('Solicitud no encontrada');
    if (sr.status !== 'COMPLETED')
        throw new Error('Solo se puede reembolsar en estado COMPLETED');
    // TODO Fase 2: llamar API de Stripe/MercadoPago para reembolso real
    return prisma_1.default.$transaction([
        prisma_1.default.serviceRequest.update({
            where: { id: serviceRequestId },
            data: { status: 'REFUNDED' },
        }),
        prisma_1.default.transaction.updateMany({
            where: { serviceRequestId, status: 'COMPLETED' },
            data: { status: 'REFUNDED' },
        }),
    ]);
}
