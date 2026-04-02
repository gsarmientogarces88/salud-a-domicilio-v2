"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpireHoldsJob = startExpireHoldsJob;
exports.stopExpireHoldsJob = stopExpireHoldsJob;
const agenda_service_1 = require("../services/agenda.service");
const INTERVAL_MS = 60000; // cada 1 minuto
let timer = null;
function startExpireHoldsJob() {
    if (timer)
        return;
    console.log(`[AGENDA] Job expirar holds iniciado (cada ${INTERVAL_MS / 1000}s)`);
    timer = setInterval(run, INTERVAL_MS);
    run();
}
async function run() {
    try {
        const count = await (0, agenda_service_1.expireHeldRequests)();
        if (count > 0) {
            console.log(`[AGENDA] ${count} solicitud(es) expirada(s)`);
        }
    }
    catch (err) {
        console.error('[AGENDA] Error en job expire holds:', err);
    }
}
function stopExpireHoldsJob() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[AGENDA] Job expirar holds detenido');
    }
}
