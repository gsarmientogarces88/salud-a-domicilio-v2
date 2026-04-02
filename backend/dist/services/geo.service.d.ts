import type { LocationSource } from '@prisma/client';
export type EffectiveLocation = {
    kind: 'LIVE';
    lat: number;
    lng: number;
    accuracyMeters: number | null;
    capturedAt: Date;
    expiresAt: Date;
    source: LocationSource;
} | {
    kind: 'BASE';
    lat: number;
    lng: number;
} | {
    kind: 'UNKNOWN';
};
export declare function getEffectiveDoctorLocation(doctorId: string): Promise<EffectiveLocation>;
export declare function distanceKm(a: {
    lat: number;
    lng: number;
}, b: {
    lat: number;
    lng: number;
}): number;
export declare function isUrgentRequestEligibleByDistance(args: {
    doctorLocation: EffectiveLocation;
    requestLat: number | null;
    requestLng: number | null;
    radiusKm?: number;
}): {
    eligible: false;
    reason: "REQUEST_LOCATION_MISSING";
    distanceKm?: undefined;
} | {
    eligible: false;
    reason: "DOCTOR_LOCATION_MISSING";
    distanceKm?: undefined;
} | {
    eligible: boolean;
    distanceKm: number;
    reason?: undefined;
};
