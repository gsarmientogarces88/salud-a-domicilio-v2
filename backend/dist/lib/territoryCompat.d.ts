/**
 * Compatibilidad API: acepta `province` (canónico) o `city` (legacy) en body/query.
 * La base mantiene columna física `city` mapeada a `province` en Prisma.
 */
export declare function coalesceProvinceFromPayload(payload: {
    province?: unknown;
    city?: unknown;
}): string;
export declare function coalesceProvinceFromQuery(q: Record<string, unknown>): string;
