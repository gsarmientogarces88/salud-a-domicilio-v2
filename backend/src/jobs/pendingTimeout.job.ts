import prisma from '../lib/prisma';
import { config } from '../config';

/** Misma frase que usa el frontend para distinguir cierre automático (ver `serviceRequestTtl.ts`). */
export const AUTO_EXPIRE_PENDING_CANCEL_REASON =
  'Expiró el tiempo de búsqueda de un médico disponible.';

const INTERVAL_MS = 10_000;

async function expirePendingRequests() {
  try {
    const now = new Date();
    const urgentMs = Math.max(1, config.serviceRequests.urgentPendingTtlMinutes) * 60 * 1000;
    const scheduledMs = Math.max(1, config.serviceRequests.scheduledPendingTtlMinutes) * 60 * 1000;

    const pending = await prisma.serviceRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true, type: true, createdAt: true, expiresAt: true },
    });

    const ids = pending
      .filter((r) => {
        if (r.expiresAt) return r.expiresAt < now;
        const ttl = r.type === 'URGENT' ? urgentMs : scheduledMs;
        return r.createdAt.getTime() + ttl <= now.getTime();
      })
      .map((r) => r.id);

    if (ids.length === 0) return;

    const expired = await prisma.serviceRequest.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelReason: AUTO_EXPIRE_PENDING_CANCEL_REASON,
      },
    });

    if (expired.count > 0) {
      console.log(`[TIMEOUT] ${expired.count} solicitud(es) PENDING expirada(s)`);
    }
  } catch (err) {
    console.error('[TIMEOUT] Error:', err);
  }
}

let timer: NodeJS.Timeout | null = null;

export function startPendingTimeoutJob() {
  if (timer) return;
  console.log(`[TIMEOUT] Job PENDING iniciado (cada ${INTERVAL_MS / 1000}s)`);
  timer = setInterval(expirePendingRequests, INTERVAL_MS);
  void expirePendingRequests();
}

export function stopPendingTimeoutJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[TIMEOUT] Job PENDING detenido');
  }
}
