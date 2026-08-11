/**
 * Geocodificación Mapbox (urgencia + agenda).
 */

export type GeocodeChileOk = {
  ok: true;
  lat: number;
  lng: number;
  placeName: string;
  region?: string | null;
  province?: string | null;
  commune?: string | null;
};

export type GeocodeChileResult = GeocodeChileOk | { ok: false; error: string };

type MapboxFeature = {
  center?: [number, number];
  place_name?: string;
  text?: string;
  context?: Array<{ id?: string; text?: string }>;
};

function contextText(feature: MapboxFeature | undefined, prefix: string): string | null {
  const hit = feature?.context?.find((c) => String(c.id || '').startsWith(prefix));
  return hit?.text?.trim() || null;
}

function parseFeature(feature: MapboxFeature | undefined): GeocodeChileOk | null {
  if (!feature?.center || !Array.isArray(feature.center) || feature.center.length < 2) return null;
  const [lng, lat] = feature.center;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const region = contextText(feature, 'region.');
  const province =
    contextText(feature, 'district.') ||
    contextText(feature, 'place.') ||
    contextText(feature, 'locality.');
  const commune =
    contextText(feature, 'place.') ||
    contextText(feature, 'locality.') ||
    feature.text?.trim() ||
    null;

  return {
    ok: true,
    lat,
    lng,
    placeName: feature.place_name?.trim() || feature.text?.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    region,
    province,
    commune,
  };
}

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
    const feature = Array.isArray(data?.features) ? (data.features[0] as MapboxFeature) : undefined;
    const parsed = parseFeature(feature);
    if (!parsed) {
      return { ok: false, error: 'No se encontró la dirección' };
    }
    return parsed;
  } catch {
    return { ok: false, error: 'Error buscando la dirección. Intenta nuevamente.' };
  }
}

export async function reverseGeocodeChile(lat: number, lng: number): Promise<GeocodeChileResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return { ok: false, error: 'Falta configurar NEXT_PUBLIC_MAPBOX_TOKEN.' };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Coordenadas inválidas.' };
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=cl&limit=1&language=es`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const feature = Array.isArray(data?.features) ? (data.features[0] as MapboxFeature) : undefined;
    const parsed = parseFeature(feature);
    if (!parsed) {
      return { ok: false, error: 'No se pudo obtener la dirección del pin.' };
    }
    return parsed;
  } catch {
    return { ok: false, error: 'Error al leer la ubicación del mapa.' };
  }
}
