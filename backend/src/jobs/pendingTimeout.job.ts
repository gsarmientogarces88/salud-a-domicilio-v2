import prisma from '../lib/prisma';

const INTERVAL_MS = 10_000; // cada 10 segundos

async function expirePendingRequests() {
  try {
    const now = new Date();

    const expired = await prisma.serviceRequest.updateMany({
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
  } catch (err) {
    console.error('[TIMEOUT] Error:', err);
  }
}

let timer: NodeJS.Timeout | null = null;

export function startPendingTimeoutJob() {
  if (timer) return;
  console.log(`[TIMEOUT] Job iniciado (cada ${INTERVAL_MS / 1000}s)`);
  timer = setInterval(expirePendingRequests, INTERVAL_MS);
  // Ejecutar inmediatamente la primera vez
  expirePendingRequests();
}

export function stopPendingTimeoutJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[TIMEOUT] Job detenido');
  }
}
