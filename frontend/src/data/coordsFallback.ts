/**
 * Coordenadas aproximadas por comuna para MVP (sin geocoding externo).
 * Biobío / Concepción área.
 */
export const COMMUNE_COORDS: Record<string, { lat: number; lng: number }> = {
  Concepción: { lat: -36.8269, lng: -73.0503 },
  'San Pedro de la Paz': { lat: -36.8428, lng: -73.1039 },
  Talcahuano: { lat: -36.7248, lng: -73.1134 },
  Chiguayante: { lat: -36.9236, lng: -73.0286 },
  Hualpén: { lat: -36.7872, lng: -73.1042 },
  Coronel: { lat: -37.0346, lng: -73.1404 },
  Lota: { lat: -37.0899, lng: -73.1577 },
  // Metropolitana
  Santiago: { lat: -33.4489, lng: -70.6693 },
  Providencia: { lat: -33.4266, lng: -70.6142 },
  'Las Condes': { lat: -33.4167, lng: -70.5667 },
  Ñuñoa: { lat: -33.4569, lng: -70.5993 },
  'La Florida': { lat: -33.5222, lng: -70.5933 },
  Maipú: { lat: -33.5094, lng: -70.7586 },
  'San Miguel': { lat: -33.4942, lng: -70.6511 },
};

export function getCoordsForCommune(commune: string): { lat: number; lng: number } {
  const c = COMMUNE_COORDS[commune];
  if (c) return c;
  return { lat: -36.8269, lng: -73.0503 }; // Concepción por defecto
}
