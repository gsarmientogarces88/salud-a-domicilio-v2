"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInProgressAutoCompleteJob = startInProgressAutoCompleteJob;
exports.stopInProgressAutoCompleteJob = stopInProgressAutoCompleteJob;
const serviceRequests_service_1 = require("../services/serviceRequests.service");
/**
 * Propuesta futura (no implementada): tras integrar pago (Webpay u otro) y cerrar el flujo
 * “pago confirmado → servicio asegurado”, reconsiderar autocancelación por tiempo en estados
 * intermedios usando `acceptedAt` / `queuedAt`, p. ej. env
 * `SERVICE_REQUEST_ACCEPTED_AUTO_CANCEL_MINUTES` y `SERVICE_REQUEST_QUEUED_AUTO_CANCEL_MINUTES`.
 * Hoy se omiten a propósito para no colisionar con pruebas ni con la lógica antes del pago.
 */
/** Intervalo entre barridos; el corte de IN_PROGRESS usa `startedAt` en BD. */
const INTERVAL_MS = 60000;
let timer = null;
async function run() {
    try {
        const n = await (0, serviceRequests_service_1.autoCompleteStaleInProgressServices)();
        if (n > 0) {
            console.log(`[SERVICE_REQUEST_SWEEP] IN_PROGRESS→COMPLETED: ${n}`);
        }
    }
    catch (err) {
        console.error('[SERVICE_REQUEST_SWEEP] Error:', err);
    }
}
function startInProgressAutoCompleteJob() {
    if (timer)
        return;
    console.log(`[SERVICE_REQUEST_SWEEP] Job iniciado (cada ${INTERVAL_MS / 1000}s)`);
    timer = setInterval(run, INTERVAL_MS);
    void run();
}
function stopInProgressAutoCompleteJob() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[SERVICE_REQUEST_SWEEP] Job detenido');
    }
}
