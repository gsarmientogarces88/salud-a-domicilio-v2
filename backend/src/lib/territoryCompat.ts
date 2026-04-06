/**
 * Compatibilidad API: acepta `province` (canónico) o `city` (legacy) en body/query.
 * La base mantiene columna física `city` mapeada a `province` en Prisma.
 */

export function coalesceProvinceFromPayload(payload: { province?: unknown; city?: unknown }): string {
  const p = typeof payload.province === 'string' ? payload.province.trim() : '';
  const c = typeof payload.city === 'string' ? payload.city.trim() : '';
  return p || c || '';
}

export function coalesceProvinceFromQuery(q: Record<string, unknown>): string {
  const p = q.province;
  const c = q.city;
  const s = (typeof p === 'string' ? p : typeof c === 'string' ? c : '') || '';
  return s.trim();
}
