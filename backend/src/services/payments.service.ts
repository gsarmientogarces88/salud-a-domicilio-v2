import prisma from '../lib/prisma';

// Obtener % comisión vigente
async function getCommissionPercentage(): Promise<number> {
  const cfg = await prisma.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
  return cfg?.percentage ?? 20;
}

// Calcular desglose de montos
export function calculateAmounts(totalAmount: number, commissionPercentage: number) {
  const commissionAmount = Math.round(totalAmount * (commissionPercentage / 100));
  const doctorNetAmount = totalAmount - commissionAmount;
  return { totalAmount, commissionPercentage, commissionAmount, doctorNetAmount };
}

// Crear transacción asociada a un serviceRequest
export async function createTransaction(
  serviceRequestId: string,
  provider: string,
  amount: number,
  providerRef?: string
) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.status !== 'ACCEPTED') throw new Error('Solo se puede pagar en estado ACCEPTED');

  return prisma.transaction.create({
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
export async function markAsPaid(serviceRequestId: string, providerRef?: string) {
  const sr = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { transactions: { where: { status: 'PENDING' }, take: 1 } },
  });

  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.status !== 'ACCEPTED') throw new Error('Solo se puede pagar en estado ACCEPTED');

  const tx = sr.transactions[0];
  if (!tx) throw new Error('No hay transacción pendiente');

  const pct = await getCommissionPercentage();
  const amounts = calculateAmounts(sr.totalAmount, pct);

  return prisma.$transaction([
    // Marcar transacción como completada
    prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: 'COMPLETED',
        providerRef: providerRef ?? tx.providerRef,
      },
    }),
    // Actualizar montos en serviceRequest
    prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        commissionAmount: amounts.commissionAmount,
        doctorNetAmount: amounts.doctorNetAmount,
      },
    }),
  ]);
}

// Placeholder: procesar reembolso
export async function refund(serviceRequestId: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.status !== 'COMPLETED') throw new Error('Solo se puede reembolsar en estado COMPLETED');

  // TODO Fase 2: llamar API de Stripe/MercadoPago para reembolso real

  return prisma.$transaction([
    prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { status: 'REFUNDED' },
    }),
    prisma.transaction.updateMany({
      where: { serviceRequestId, status: 'COMPLETED' },
      data: { status: 'REFUNDED' },
    }),
  ]);
}
