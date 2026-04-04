/**
 * Debe coincidir con backend `SERVICE_REQUEST_*_PENDING_TTL_MINUTES` y mensaje del job `pendingTimeout.job.ts`.
 */
export const AUTO_EXPIRE_PENDING_CANCEL_REASON = 'Expiró el tiempo de búsqueda de un médico disponible.';

/**
 * Mismos prefijos que el backend (`serviceRequests.service.ts`). El barrido automático
 * ACCEPTED/QUEUED está apagado hasta el flujo de pago; los helpers sirven para filas históricas.
 */
export const AUTO_CANCELLED_ACCEPTED_TIMEOUT_MARKER = '[AUTO_CANCELLED_ACCEPTED_TIMEOUT]';
export const AUTO_CANCELLED_QUEUED_TIMEOUT_MARKER = '[AUTO_CANCELLED_QUEUED_TIMEOUT]';

export function isAcceptedTimeoutCancellation(reason: string | null | undefined): boolean {
  return !!reason?.includes(AUTO_CANCELLED_ACCEPTED_TIMEOUT_MARKER);
}

export function isQueuedTimeoutCancellation(reason: string | null | undefined): boolean {
  return !!reason?.includes(AUTO_CANCELLED_QUEUED_TIMEOUT_MARKER);
}

export function parseEnvMinutes(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const URGENT_PENDING_FALLBACK_MINUTES = parseEnvMinutes(
  process.env.NEXT_PUBLIC_SERVICE_REQUEST_URGENT_PENDING_TTL_MINUTES,
  10
);

export const SCHEDULED_PENDING_FALLBACK_MINUTES = parseEnvMinutes(
  process.env.NEXT_PUBLIC_SERVICE_REQUEST_SCHEDULED_PENDING_TTL_MINUTES,
  10
);

export function urgentExpiresAtMs(createdAtIso: string, expiresAtIso?: string | null): number {
  if (expiresAtIso) {
    const ms = new Date(expiresAtIso).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  const createdMs = new Date(createdAtIso).getTime();
  return createdMs + URGENT_PENDING_FALLBACK_MINUTES * 60 * 1000;
}

export function pendingExpiresAtMs(
  type: 'URGENT' | 'SCHEDULED' | string,
  createdAtIso: string,
  expiresAtIso?: string | null
): number {
  if (expiresAtIso) {
    const ms = new Date(expiresAtIso).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  const createdMs = new Date(createdAtIso).getTime();
  const min = type === 'URGENT' ? URGENT_PENDING_FALLBACK_MINUTES : SCHEDULED_PENDING_FALLBACK_MINUTES;
  return createdMs + min * 60 * 1000;
}

/** Alineado con `SERVICE_REQUEST_IN_PROGRESS_AUTO_COMPLETE_MINUTES` en backend (alerta previa). */
export const IN_PROGRESS_WARNING_AFTER_MINUTES = parseEnvMinutes(
  process.env.NEXT_PUBLIC_SERVICE_REQUEST_IN_PROGRESS_WARNING_MINUTES,
  85
);

export const IN_PROGRESS_AUTO_COMPLETE_MINUTES = parseEnvMinutes(
  process.env.NEXT_PUBLIC_SERVICE_REQUEST_IN_PROGRESS_AUTO_COMPLETE_MINUTES,
  100
);

export function inProgressElapsedMinutes(startedAtIso: string | null | undefined, nowMs: number): number | null {
  if (!startedAtIso) return null;
  const t = new Date(startedAtIso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (nowMs - t) / 60_000);
}
