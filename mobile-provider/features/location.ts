import { apiFetch } from '../lib/api';

/**
 * GPS en primer plano (preparado). En este MVP no se publica en background.
 * El backend ya acepta PUT /doctor/me/location/live con source APP_GPS.
 */
export async function publishLiveLocation(coords: {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}) {
  return apiFetch('/doctor/me/location/live', {
    method: 'PUT',
    body: JSON.stringify({
      lat: coords.lat,
      lng: coords.lng,
      accuracyMeters: coords.accuracyMeters ? Math.round(coords.accuracyMeters) : undefined,
      source: 'APP_GPS',
      permissionState: 'granted',
      capturedAt: new Date().toISOString(),
    }),
  });
}

export async function requestForegroundLocation(): Promise<{
  lat: number;
  lng: number;
  accuracyMeters?: number;
} | null> {
  try {
    const Location = await import('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyMeters: pos.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}
