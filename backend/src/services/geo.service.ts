import prisma from '../lib/prisma';
import { config } from '../config';
import { haversineDistance } from '../lib/haversine';
import type { LocationSource } from '@prisma/client';

export type EffectiveLocation =
  | {
      kind: 'LIVE';
      lat: number;
      lng: number;
      accuracyMeters: number | null;
      capturedAt: Date;
      expiresAt: Date;
      source: LocationSource;
    }
  | {
      kind: 'BASE';
      lat: number;
      lng: number;
    }
  | {
      kind: 'UNKNOWN';
    };

function isExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

function isAccuracyAcceptable(source: LocationSource, accuracyMeters: number | null) {
  if (accuracyMeters == null) return false;
  const max =
    source === 'APP_GPS'
      ? config.geo.minAccuracyMetersApp
      : source === 'WEB_BROWSER'
        ? config.geo.minAccuracyMetersWeb
        : config.geo.minAccuracyMetersWeb;
  return accuracyMeters <= max;
}

export async function getEffectiveDoctorLocation(doctorId: string): Promise<EffectiveLocation> {
  const [doctor, live] = await Promise.all([
    prisma.doctorProfile.findUnique({ where: { id: doctorId }, select: { baseLat: true, baseLng: true } }),
    prisma.doctorLiveLocation.findUnique({ where: { doctorId } }),
  ]);

  if (live && !isExpired(live.expiresAt) && isAccuracyAcceptable(live.source, live.accuracyMeters ?? null)) {
    return {
      kind: 'LIVE',
      lat: live.lat,
      lng: live.lng,
      accuracyMeters: live.accuracyMeters ?? null,
      capturedAt: live.capturedAt,
      expiresAt: live.expiresAt,
      source: live.source,
    };
  }

  if (doctor?.baseLat != null && doctor?.baseLng != null) {
    return { kind: 'BASE', lat: doctor.baseLat, lng: doctor.baseLng };
  }

  return { kind: 'UNKNOWN' };
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversineDistance(a.lat, a.lng, b.lat, b.lng);
}

export function isUrgentRequestEligibleByDistance(args: {
  doctorLocation: EffectiveLocation;
  requestLat: number | null;
  requestLng: number | null;
  radiusKm?: number;
}) {
  const { doctorLocation, requestLat, requestLng } = args;
  const radiusKm = args.radiusKm ?? config.geo.urgentRadiusKm;

  if (requestLat == null || requestLng == null) {
    return { eligible: false as const, reason: 'REQUEST_LOCATION_MISSING' as const };
  }
  if (doctorLocation.kind === 'UNKNOWN') {
    return { eligible: false as const, reason: 'DOCTOR_LOCATION_MISSING' as const };
  }

  const dist = distanceKm({ lat: doctorLocation.lat, lng: doctorLocation.lng }, { lat: requestLat, lng: requestLng });

  return { eligible: dist <= radiusKm, distanceKm: dist };
}

