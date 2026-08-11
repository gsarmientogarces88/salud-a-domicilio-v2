import prisma from '../lib/prisma';
import { haversineDistance } from '../lib/haversine';
import { assertBookingSlotAllowed } from '../lib/appointmentBookingRules';
import { assertAgendaBaseFeeConfigured } from '../lib/agendaPricing';
import { config } from '../config';

const HOLD_MINUTES = 20;

function getHoldUntil(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + HOLD_MINUTES);
  return d;
}

/**
 * Valida que la dirección esté dentro de cobertura y no en zona excluida.
 * @returns { valid: boolean, error?: string }
 */
export function validateAddressForProfessional(
  professional: { baseLat: number | null; baseLng: number | null; coverageKm: number | null; excludedZones: unknown },
  lat: number,
  lng: number,
  commune: string
): { valid: true } | { valid: false; error: string } {
  const excluded = (professional.excludedZones as string[] | null) || [];
  const communeNorm = commune.trim().toLowerCase();
  if (excluded.some((z) => z.trim().toLowerCase() === communeNorm)) {
    return { valid: false, error: 'Zona no atendida por el profesional.' };
  }

  const baseLat = professional.baseLat;
  const baseLng = professional.baseLng;
  const coverageKm = professional.coverageKm ?? config.geo.agendaRadiusKm;

  if (baseLat == null || baseLng == null) {
    // Sin coordenadas base: aceptar por defecto (MVP)
    return { valid: true };
  }

  const km = haversineDistance(baseLat, baseLng, lat, lng);
  if (km > coverageKm) {
    return {
      valid: false,
      error: `Este profesional atiende hasta ${coverageKm} km desde su base. Elige otro profesional.`,
    };
  }

  return { valid: true };
}

export async function createAppointmentRequest(data: {
  patientId: string;
  professionalId: string;
  slotId: string;
  addressText: string;
  region: string;
  province: string;
  commune: string;
  lat: number;
  lng: number;
  notes?: string;
}) {
  const { patientId, professionalId, slotId, addressText, region, province, commune, lat, lng, notes } = data;

  const [professional, slot] = await Promise.all([
    prisma.doctorProfile.findUnique({ where: { id: professionalId } }),
    prisma.availabilitySlot.findUnique({ where: { id: slotId }, include: { professional: true } }),
  ]);

  if (!professional) throw new Error('Profesional no encontrado');
  assertAgendaBaseFeeConfigured(professional.baseFee);
  if (!slot) throw new Error('Slot no encontrado');
  if (slot.professionalId !== professionalId) throw new Error('Slot no pertenece al profesional');
  if (slot.status !== 'AVAILABLE') throw new Error('El horario ya no está disponible');

  assertBookingSlotAllowed(slot.startAt, new Date());

  const validation = validateAddressForProfessional(professional, lat, lng, commune);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const holdUntil = getHoldUntil();
  const amount = assertAgendaBaseFeeConfigured(professional.baseFee);

  const result = await prisma.$transaction(async (tx) => {
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
        province,
        commune,
        lat,
        lng,
        notes,
        status: 'PENDING',
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

export async function acceptAppointmentRequest(requestId: string, professionalId: string) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id: requestId },
    include: { slot: true, payment: true },
  });

  if (!request) throw new Error('Solicitud no encontrada');
  if (request.professionalId !== professionalId) throw new Error('No puedes aceptar esta solicitud');
  if (request.status !== 'PENDING') {
    throw new Error(`Solicitud en estado ${request.status}, no puede aceptarse`);
  }
  if (request.slot.status !== 'HELD') throw new Error('El slot ya no está en hold');
  if (request.slot.heldUntil && request.slot.heldUntil < new Date()) {
    throw new Error('El hold del slot ha expirado');
  }

  await prisma.$transaction(async (tx) => {
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

export async function rejectAppointmentRequest(
  requestId: string,
  professionalId: string,
  reason: string,
  comment?: string
) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id: requestId },
    include: { slot: true },
  });

  if (!request) throw new Error('Solicitud no encontrada');
  if (request.professionalId !== professionalId) throw new Error('No puedes rechazar esta solicitud');
  if (request.status !== 'PENDING') {
    throw new Error(`Solicitud en estado ${request.status}`);
  }

  await prisma.$transaction(async (tx) => {
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

export async function expireHeldRequests() {
  const now = new Date();

  const expired = await prisma.appointmentRequest.findMany({
    where: {
      status: 'PENDING',
      slot: {
        heldUntil: { lt: now },
      },
    },
    include: { slot: true },
  });

  for (const req of expired) {
    try {
      await prisma.$transaction(async (tx) => {
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
    } catch (e) {
      console.error(`[AGENDA] Error al expirar ${req.id}:`, e);
    }
  }

  return expired.length;
}
