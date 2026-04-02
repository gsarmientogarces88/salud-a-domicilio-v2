import { ServiceStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { config } from '../config';

class OpenServiceExistsError extends Error {
  code = 'OPEN_SERVICE_EXISTS' as const;
  openService: {
    id: string;
    status: ServiceStatus;
    createdAt: Date;
    doctorName?: string | null;
  };

  constructor(openService: { id: string; status: ServiceStatus; createdAt: Date; doctorName?: string | null }) {
    super(
      'Ya tienes una atención en curso o pendiente. Debes finalizar o cerrar la actual antes de solicitar otra.'
    );
    this.openService = openService;
  }
}

// Transiciones válidas
const TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  PENDING: ['CANCELLED'],
  QUEUED: ['IN_PROGRESS'],
  ACCEPTED: ['IN_PROGRESS'], // legacy: mantener compatibilidad
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
  region?: string;
  referencias?: string;
  sexo?: string;
  telefono?: string;
  edadPaciente?: number;
  esMenorEdad?: boolean;
  tieneFiebre?: boolean;
  dificultadRespiratoria?: boolean;
  doctorId?: string;
  scheduledAt?: Date;
}) {
  // Regla: paciente no puede tener más de una atención abierta
  const nowForValidation = new Date();
  const openExisting = await prisma.serviceRequest.findFirst({
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
  const rawTtlMin =
    data.type === 'URGENT'
      ? config.serviceRequests.urgentPendingTtlMinutes
      : config.serviceRequests.scheduledPendingTtlMinutes;
  const ttlMin = Number.isFinite(rawTtlMin) ? Math.max(1, rawTtlMin) : data.type === 'URGENT' ? 15 : 10;
  const expiresAt = new Date(now.getTime() + ttlMin * 60 * 1000);

  let totalAmount: number;
  let urgentFixedPrice: number | null = null;

  if (data.type === 'URGENT') {
    totalAmount = cfg.urgentFixedFee;
    urgentFixedPrice = cfg.urgentFixedFee;
  } else {
    if (data.doctorId) {
      const doc = await prisma.doctorProfile.findUnique({ where: { id: data.doctorId } });
      if (!doc || !doc.isVerified || !doc.isAvailable) throw new Error('Médico no disponible');
      totalAmount = doc.baseFee;
    } else {
      // Para reservas SCHEDULED sin profesional asignado todavía usamos una tarifa base
      // configurable (por ahora reutilizamos urgentFixedFee como valor de referencia).
      totalAmount = cfg.urgentFixedFee;
    }
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
export async function acceptRequest(serviceId: string, doctorId: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.status !== 'PENDING') throw new Error(`No se puede aceptar desde ${sr.status}`);
  if (sr.expiresAt && sr.expiresAt < new Date()) throw new Error('Solicitud expirada');
  if (sr.doctorId && sr.doctorId !== doctorId) throw new Error('Solicitud ya asignada a otro médico');

  if (config.isDev) {
    // eslint-disable-next-line no-console
    console.log('[services.accept] attempt:', { serviceId, doctorId, status: sr.status, createdAt: sr.createdAt, expiresAt: sr.expiresAt });
  }

  const doc = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doc || !doc.isVerified) throw new Error('Médico no verificado');

  const rejected = await prisma.serviceRequestRejection.findUnique({
    where: { serviceRequestId_doctorId: { serviceRequestId: serviceId, doctorId } },
    select: { id: true },
  });
  if (rejected) throw new Error('Ya rechazaste esta solicitud');

  // Si es URGENT, recalcular montos con tarifa fija
  const cfg = await getConfig();
  const totalAmount = sr.type === 'URGENT' ? cfg.urgentFixedFee : sr.totalAmount;
  const commissionAmount = Math.round(totalAmount * (cfg.percentage / 100));

  // Regla prestador: 1 activo (IN_PROGRESS) + 1 en cola (QUEUED)
  const [active, queued] = await Promise.all([
    prisma.serviceRequest.findFirst({
      where: { doctorId, status: 'IN_PROGRESS' },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.serviceRequest.findFirst({
      where: { doctorId, status: 'QUEUED' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (active && queued) {
    throw new Error('Ya tienes una atención activa y otra en espera. Finaliza una antes de aceptar otra.');
  }

  const nextStatus: ServiceStatus = active ? 'QUEUED' : 'IN_PROGRESS';
  const startedAt = active ? undefined : new Date();

  const updated = await prisma.serviceRequest.update({
    where: { id: serviceId },
    data: {
      status: nextStatus,
      doctorId,
      totalAmount,
      commissionAmount,
      doctorNetAmount: totalAmount - commissionAmount,
      ...(startedAt ? { startedAt } : {}),
    },
  });

  if (config.isDev) {
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

  const now = new Date();
  const completed = await prisma.serviceRequest.update({
    where: { id: serviceId },
    data: { status: 'COMPLETED', completedAt: now, notes },
  });

  // Al completar: si existe una solicitud en cola (QUEUED), iniciarla automáticamente
  const next = await prisma.serviceRequest.findFirst({
    where: { doctorId, status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (next) {
    await prisma.serviceRequest.update({
      where: { id: next.id },
      data: { status: 'IN_PROGRESS', startedAt: now },
    });
    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.complete] queued->in_progress:', { completedId: serviceId, nextId: next.id, doctorId });
    }
  }

  return completed;
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

// Cancelar por parte del profesional (no penaliza al paciente)
export async function cancelByDoctor(serviceId: string, doctorId: string, reason?: string) {
  const sr = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
  if (!sr) throw new Error('Solicitud no encontrada');
  if (sr.doctorId !== doctorId) throw new Error('Solo el profesional asignado puede cancelar la cita');
  if (!canTransition(sr.status, 'CANCELLED')) throw new Error('No se permite cancelar en este estado');

  return prisma.serviceRequest.update({
    where: { id: serviceId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });
}
