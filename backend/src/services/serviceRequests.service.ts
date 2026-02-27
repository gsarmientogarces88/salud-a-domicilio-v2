import { ServiceStatus } from '@prisma/client';
import prisma from '../lib/prisma';

// Transiciones válidas
const TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

function canTransition(from: ServiceStatus, to: ServiceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Obtener config de plataforma
async function getConfig() {
  const cfg = await prisma.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
  return {
    pendingTimeoutSec: cfg?.pendingTimeoutSec ?? 240,
    percentage: cfg?.percentage ?? 20,
    urgentFixedFee: cfg?.urgentFixedFee ?? 35000,
    maxCancellations: cfg?.maxCancellations ?? 3,
  };
}

// Crear solicitud
export async function createRequest(data: {
  patientId: string;
  type: 'URGENT' | 'SCHEDULED';
  description: string;
  address: string;
  commune?: string;
  city?: string;
  doctorId?: string;
  scheduledAt?: Date;
}) {
  const cfg = await getConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + cfg.pendingTimeoutSec * 1000);

  let totalAmount: number;
  let urgentFixedPrice: number | null = null;

  if (data.type === 'URGENT') {
    totalAmount = cfg.urgentFixedFee;
    urgentFixedPrice = cfg.urgentFixedFee;
  } else {
    if (!data.doctorId) throw new Error('SCHEDULED requiere doctorId');
    const doc = await prisma.doctorProfile.findUnique({ where: { id: data.doctorId } });
    if (!doc || !doc.isVerified || !doc.isAvailable) throw new Error('Médico no disponible');
    totalAmount = doc.baseFee;
  }

  const commissionAmount = Math.round(totalAmount * (cfg.percentage / 100));
  const doctorNetAmount = totalAmount - commissionAmount;

  return prisma.serviceRequest.create({
    data: {
      patientId: data.patientId,
      doctorId: data.type === 'SCHEDULED' ? data.doctorId : null,
      type: data.type,
      status: 'PENDING',
      description: data.description,
      address: data.address,
      commune: data.commune,
      city: data.city,
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
export async function acceptRequest(serviceId: string, doctorId: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (!canTransition(sr.status, 'ACCEPTED')) throw new Error(`No se puede aceptar desde ${sr.status}`);
  if (sr.expiresAt && sr.expiresAt < new Date()) throw new Error('Solicitud expirada');
  if (sr.doctorId && sr.doctorId !== doctorId) throw new Error('Solicitud ya asignada a otro médico');

  const doc = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doc || !doc.isVerified) throw new Error('Médico no verificado');

  // Si es URGENT, recalcular montos con tarifa fija
  const cfg = await getConfig();
  const totalAmount = sr.type === 'URGENT' ? cfg.urgentFixedFee : sr.totalAmount;
  const commissionAmount = Math.round(totalAmount * (cfg.percentage / 100));

  return prisma.serviceRequest.update({
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
export async function startRequest(serviceId: string, doctorId: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.doctorId !== doctorId) throw new Error('No es tu solicitud');
  if (!canTransition(sr.status, 'IN_PROGRESS')) throw new Error(`No se puede iniciar desde ${sr.status}`);

  return prisma.serviceRequest.update({
    where: { id: serviceId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
}

// Completar atención
export async function completeRequest(serviceId: string, doctorId: string, notes?: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.doctorId !== doctorId) throw new Error('No es tu solicitud');
  if (!canTransition(sr.status, 'COMPLETED')) throw new Error(`No se puede completar desde ${sr.status}`);

  return prisma.serviceRequest.update({
    where: { id: serviceId },
    data: { status: 'COMPLETED', completedAt: new Date(), notes },
  });
}

// Cancelar (solo desde PENDING)
export async function cancelRequest(serviceId: string, userId: string, reason?: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (!canTransition(sr.status, 'CANCELLED')) throw new Error('No se permite cancelar en este estado');

  const cfg = await getConfig();

  // Incrementar contador y banear si excede
  const user = await prisma.user.update({
    where: { id: userId },
    data: { cancellationCount: { increment: 1 } },
  });

  if (user.cancellationCount >= cfg.maxCancellations) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, banReason: 'Exceso de cancelaciones' },
    });
  }

  return prisma.serviceRequest.update({
    where: { id: serviceId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });
}
