"use strict";
/**
 * Compatibilidad API: acepta `province` (canónico) o `city` (legacy) en body/query.
 * La base mantiene columna física `city` mapeada a `province` en Prisma.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coalesceProvinceFromPayload = coalesceProvinceFromPayload;
exports.coalesceProvinceFromQuery = coalesceProvinceFromQuery;
function coalesceProvinceFromPayload(payload) {
    const p = typeof payload.province === 'string' ? payload.province.trim() : '';
    const c = typeof payload.city === 'string' ? payload.city.trim() : '';
    return p || c || '';
}
function coalesceProvinceFromQuery(q) {
    const p = q.province;
    const c = q.city;
    const s = (typeof p === 'string' ? p : typeof c === 'string' ? c : '') || '';
    return s.trim();
}
