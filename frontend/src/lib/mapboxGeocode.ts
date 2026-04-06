/**
 * Geocodificación Mapbox (misma API y parámetros que el flujo de médico urgente).
 */

export type GeocodeChileResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string };

export function buildChileGeocodeQuery(parts: {
  streetLine: string;
  commune: string;
  province: string;
  region: string;
}): string {
  const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
  const a = norm(parts.streetLine);
  const b = norm(parts.commune);
  const c = norm(parts.province);
  const d = norm(parts.region);
  return [a, b, c, d, 'Chile'].filter(Boolean).join(', ');
}

export async function geocodeChileAddressLine(fullAddress: string): Promise<GeocodeChileResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return { ok: false, error: 'Falta configurar NEXT_PUBLIC_MAPBOX_TOKEN.' };
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    fullAddress,
  )}.json?access_token=${token}&country=cl&limit=1&language=es`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.features || !Array.isArray(data.features) || data.features.length === 0) {
      return { ok: false, error: 'No se encontró la dirección' };
    }

    const [lng, lat] = data.features[0].center as [number, number];
    return { ok: true, lat, lng };
  } catch {
    return { ok: false, error: 'Error buscando la dirección. Intenta nuevamente.' };
  }
}
