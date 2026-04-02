"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const svc = __importStar(require("../services/serviceRequests.service"));
const config_1 = require("../config");
const geo_service_1 = require("../services/geo.service");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// 1) POST /services — Paciente crea solicitud
router.post('/', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.create] payload:', req.body);
        }
        const sr = await svc.createRequest({ patientId: patient.id, ...req.body });
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.create] created:', { id: sr.id, status: sr.status, type: sr.type, expiresAt: sr.expiresAt });
        }
        res.status(201).json({ message: 'Solicitud creada', data: sr });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 2) GET /services/me — Paciente: mi historial
router.get('/me', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil no encontrado' });
        const list = await prisma_1.default.serviceRequest.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
        res.json({ data: list });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 3) GET /services/available — Médico: solicitudes Pending
router.get('/available', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const list = await prisma_1.default.serviceRequest.findMany({
            where: {
                status: 'PENDING',
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                rejections: { none: { doctorId: doctor.id } },
            },
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.available] list count:', list.length, { doctorId: doctor.id });
        }
        if (!config_1.config.geo.urgentProximityFilterEnabled) {
            return res.json({ data: list });
        }
        const effective = await (0, geo_service_1.getEffectiveDoctorLocation)(doctor.id);
        const filtered = list.filter((sr) => {
            if (sr.type !== 'URGENT')
                return true; // no aplicar radio a agendadas/programadas
            const r = (0, geo_service_1.isUrgentRequestEligibleByDistance)({
                doctorLocation: effective,
                requestLat: sr.requestLat,
                requestLng: sr.requestLng,
                radiusKm: config_1.config.geo.urgentRadiusKm,
            });
            return r.eligible;
        });
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.available] filtered count:', filtered.length, { geoFilter: true });
        }
        res.json({ data: filtered });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 4) GET /services/doctor/me — Médico: mis atenciones
router.get('/doctor/me', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const { status } = req.query;
        const where = { doctorId: doctor.id };
        if (status)
            where.status = status;
        const list = await prisma_1.default.serviceRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
                transactions: true,
            },
        });
        res.json({ data: list });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 5) GET /services/:id — Detalle (dueño, médico asignado o admin)
router.get('/:id', async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({
            where: { id: req.params.id },
            include: {
                patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
                doctor: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
                transactions: true,
            },
        });
        if (!sr)
            return res.status(404).json({ error: true, message: 'No encontrada' });
        // Verificar acceso
        const userId = req.user.id;
        const role = req.user.role;
        if (role === 'ADMIN')
            return res.json({ data: sr });
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId } });
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId } });
        const isOwner = patient?.id === sr.patientId || doctor?.id === sr.doctorId;
        if (!isOwner)
            return res.status(403).json({ error: true, message: 'Sin acceso' });
        res.json({ data: sr });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 5b) PATCH /services/:id/location — Paciente confirma pin/ubicación (snapshot)
const confirmLocationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    capturedAt: zod_1.z.string().datetime().optional(),
    accuracyMeters: zod_1.z.number().int().positive().max(100000).optional(),
    source: zod_1.z
        .enum(['PATIENT_MAP_PIN', 'PATIENT_GPS', 'ADDRESS_GEOCODE', 'ADMIN_MANUAL', 'UNKNOWN'])
        .optional()
        .default('PATIENT_MAP_PIN'),
    precision: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional().default('UNKNOWN'),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
router.patch('/:id/location', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.id } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (sr.patientId !== patient.id)
            return res.status(403).json({ error: true, message: 'Sin acceso' });
        const parsed = confirmLocationSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: true, message: parsed.error.message });
        const capturedAt = parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date();
        const updated = await prisma_1.default.serviceRequest.update({
            where: { id: sr.id },
            data: {
                requestLat: parsed.data.lat,
                requestLng: parsed.data.lng,
                requestLocationCapturedAt: capturedAt,
                requestLocationAccuracyMeters: parsed.data.accuracyMeters,
                requestLocationSource: parsed.data.source,
                requestLocationPrecision: parsed.data.precision,
                requestLocationConfidence: parsed.data.confidence,
            },
        });
        res.json({ message: 'Ubicación confirmada', data: updated });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 6) POST /services/:id/accept — Médico acepta
router.post('/:id/accept', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const sr = await svc.acceptRequest(req.params.id, doctor.id);
        res.json({ message: 'Solicitud aceptada', data: sr });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
const rejectSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
// 6b) POST /services/:id/reject — Médico rechaza (no cambia estado global)
router.post('/:id/reject', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.id } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (sr.status !== 'PENDING') {
            return res.status(400).json({ error: true, message: 'Solo se pueden rechazar solicitudes en estado PENDING' });
        }
        if (sr.doctorId && sr.doctorId !== doctor.id) {
            return res.status(400).json({ error: true, message: 'La solicitud ya fue tomada por otro médico' });
        }
        const parsed = rejectSchema.safeParse(req.body ?? {});
        if (!parsed.success)
            return res.status(400).json({ error: true, message: parsed.error.message });
        await prisma_1.default.serviceRequestRejection.upsert({
            where: { serviceRequestId_doctorId: { serviceRequestId: sr.id, doctorId: doctor.id } },
            create: { serviceRequestId: sr.id, doctorId: doctor.id, reason: parsed.data.reason },
            update: { reason: parsed.data.reason },
        });
        res.json({ message: 'Solicitud rechazada' });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 7) PATCH /services/:id/status — Médico cambia estado (InProgress, Completed)
router.patch('/:id/status', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const { status, notes } = req.body;
        let sr;
        if (status === 'IN_PROGRESS') {
            sr = await svc.startRequest(req.params.id, doctor.id);
        }
        else if (status === 'COMPLETED') {
            sr = await svc.completeRequest(req.params.id, doctor.id, notes);
        }
        else {
            return res.status(400).json({ error: true, message: 'Status no permitido desde esta ruta' });
        }
        res.json({ message: `Estado actualizado a ${status}`, data: sr });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 8) DELETE /services/:id — Cancelar (solo PENDING)
router.delete('/:id', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const sr = await svc.cancelRequest(req.params.id, req.user.id, req.body.reason);
        res.json({ message: 'Solicitud cancelada', data: sr });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 8b) POST /services/:id/cancel-by-doctor — Profesional cancela con motivo
router.post('/:id/cancel-by-doctor', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const { reason } = req.body;
        const sr = await svc.cancelByDoctor(req.params.id, doctor.id, reason);
        res.json({ message: 'Cita cancelada por el profesional', data: sr });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 9) GET /services — Admin: listar todas
router.get('/', (0, roles_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = status ? { status: status } : {};
        const [list, total] = await Promise.all([
            prisma_1.default.serviceRequest.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
            prisma_1.default.serviceRequest.count({ where }),
        ]);
        res.json({ data: list, total, page: parseInt(page) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
