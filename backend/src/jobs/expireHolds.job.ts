import { expireHeldRequests } from '../services/agenda.service';

const INTERVAL_MS = 60_000; // cada 1 minuto

let timer: NodeJS.Timeout | null = null;

export function startExpireHoldsJob() {
  if (timer) return;
  console.log(`[AGENDA] Job expirar holds iniciado (cada ${INTERVAL_MS / 1000}s)`);
  timer = setInterval(run, INTERVAL_MS);
  run();
}

async function run() {
  try {
    const count = await expireHeldRequests();
    if (count > 0) {
      console.log(`[AGENDA] ${count} solicitud(es) expirada(s)`);
    }
  } catch (err) {
    console.error('[AGENDA] Error en job expire holds:', err);
  }
}

export function stopExpireHoldsJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[AGENDA] Job expirar holds detenido');
  }
}
