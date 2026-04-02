"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveDoctorLocation = getEffectiveDoctorLocation;
exports.distanceKm = distanceKm;
exports.isUrgentRequestEligibleByDistance = isUrgentRequestEligibleByDistance;
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../config");
const haversine_1 = require("../lib/haversine");
function isExpired(expiresAt, now = new Date()) {
    return expiresAt.getTime() <= now.getTime();
}
function isAccuracyAcceptable(source, accuracyMeters) {
    if (accuracyMeters == null)
        return false;
    const max = source === 'APP_GPS'
        ? config_1.config.geo.minAccuracyMetersApp
        : source === 'WEB_BROWSER'
            ? config_1.config.geo.minAccuracyMetersWeb
            : config_1.config.geo.minAccuracyMetersWeb;
    return accuracyMeters <= max;
}
async function getEffectiveDoctorLocation(doctorId) {
    const [doctor, live] = await Promise.all([
        prisma_1.default.doctorProfile.findUnique({ where: { id: doctorId }, select: { baseLat: true, baseLng: true } }),
        prisma_1.default.doctorLiveLocation.findUnique({ where: { doctorId } }),
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
function distanceKm(a, b) {
    return (0, haversine_1.haversineDistance)(a.lat, a.lng, b.lat, b.lng);
}
function isUrgentRequestEligibleByDistance(args) {
    const { doctorLocation, requestLat, requestLng } = args;
    const radiusKm = args.radiusKm ?? config_1.config.geo.urgentRadiusKm;
    if (requestLat == null || requestLng == null) {
        return { eligible: false, reason: 'REQUEST_LOCATION_MISSING' };
    }
    if (doctorLocation.kind === 'UNKNOWN') {
        return { eligible: false, reason: 'DOCTOR_LOCATION_MISSING' };
    }
    const dist = distanceKm({ lat: doctorLocation.lat, lng: doctorLocation.lng }, { lat: requestLat, lng: requestLng });
    return { eligible: dist <= radiusKm, distanceKm: dist };
}
