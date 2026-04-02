"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const config_1 = require("../config");
const geo_service_1 = require("../services/geo.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, roles_1.authorize)('DOCTOR'));
// GET /doctor/me — perfil del médico
router.get('/me', async (req, res) => {
    try {
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        res.json({ data: profile });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// GET /doctor/me/location/effective — ubicación efectiva (live > base)
router.get('/me/location/effective', async (req, res) => {
    try {
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
            select: { id: true, baseLat: true, baseLng: true },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        const effective = await (0, geo_service_1.getEffectiveDoctorLocation)(profile.id);
        res.json({ data: { effective, base: { lat: profile.baseLat, lng: profile.baseLng } } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// PATCH /doctor/me/availability — cambiar disponibilidad
router.patch('/me/availability', async (req, res) => {
    try {
        const { isAvailable } = req.body;
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ error: true, message: 'Campo isAvailable requerido' });
        }
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        const updated = await prisma_1.default.doctorProfile.update({
            where: { id: profile.id },
            data: { isAvailable },
        });
        res.json({ message: 'Disponibilidad actualizada', data: updated });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// PATCH /doctor/me/settings — configuración básica (especialidad, tarifa)
router.patch('/me/settings', async (req, res) => {
    try {
        const { specialty, baseFee } = req.body;
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        const data = {};
        if (typeof specialty === 'string' && specialty.trim())
            data.specialty = specialty.trim();
        if (typeof baseFee === 'number' && baseFee > 0)
            data.baseFee = Math.round(baseFee);
        const updated = await prisma_1.default.doctorProfile.update({
            where: { id: profile.id },
            data,
        });
        res.json({ message: 'Configuración actualizada', data: updated });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
const baseLocationSchema = zod_1.z.object({
    baseLat: zod_1.z.number().min(-90).max(90),
    baseLng: zod_1.z.number().min(-180).max(180),
});
// PATCH /doctor/me/location/base — set base fallback location
router.patch('/me/location/base', async (req, res) => {
    try {
        const parsed = baseLocationSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: true, message: parsed.error.message });
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        const updated = await prisma_1.default.doctorProfile.update({
            where: { id: profile.id },
            data: { baseLat: parsed.data.baseLat, baseLng: parsed.data.baseLng },
        });
        res.json({ message: 'Ubicación base actualizada', data: updated });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
const liveLocationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    capturedAt: zod_1.z.string().datetime().optional(),
    accuracyMeters: zod_1.z.number().int().positive().max(100000).optional(),
    source: zod_1.z.enum(['APP_GPS', 'WEB_BROWSER']).default('WEB_BROWSER'),
    permissionState: zod_1.z.enum(['granted', 'denied', 'prompt', 'unknown']).optional(),
    sessionId: zod_1.z.string().max(200).optional(),
    deviceId: zod_1.z.string().max(200).optional(),
});
// PUT /doctor/me/location/live — upsert live location (web/app)
router.put('/me/location/live', async (req, res) => {
    try {
        const parsed = liveLocationSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: true, message: parsed.error.message });
        const profile = await prisma_1.default.doctorProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        }
        const capturedAt = parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date();
        const ttlSeconds = parsed.data.source === 'APP_GPS' ? config_1.config.geo.ttlSecondsApp : config_1.config.geo.ttlSecondsWeb;
        const expiresAt = new Date(capturedAt.getTime() + ttlSeconds * 1000);
        const upserted = await prisma_1.default.doctorLiveLocation.upsert({
            where: { doctorId: profile.id },
            create: {
                doctorId: profile.id,
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                accuracyMeters: parsed.data.accuracyMeters,
                capturedAt,
                ttlSeconds,
                expiresAt,
                source: parsed.data.source,
                permissionState: parsed.data.permissionState,
                sessionId: parsed.data.sessionId,
                deviceId: parsed.data.deviceId,
            },
            update: {
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                accuracyMeters: parsed.data.accuracyMeters,
                capturedAt,
                ttlSeconds,
                expiresAt,
                source: parsed.data.source,
                permissionState: parsed.data.permissionState,
                sessionId: parsed.data.sessionId,
                deviceId: parsed.data.deviceId,
            },
        });
        res.json({ message: 'Ubicación en vivo actualizada', data: upserted });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
