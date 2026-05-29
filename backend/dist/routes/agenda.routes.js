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
const agenda = __importStar(require("../services/agenda.service"));
const appointmentBookingRules_1 = require("../lib/appointmentBookingRules");
const date_fns_tz_1 = require("date-fns-tz");
const geo = __importStar(require("../services/geo.service"));
const territoryCompat_1 = require("../lib/territoryCompat");
const scheduling_service_1 = require("../services/scheduling.service");
const agendaPricing_1 = require("../lib/agendaPricing");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// POST /agenda/requests — Paciente crea solicitud de agenda
router.post('/requests', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
        const body = req.body;
        const { professionalId, slotId, addressText, region, commune, lat, lng, notes, } = body;
        const province = (0, territoryCompat_1.coalesceProvinceFromPayload)(body);
        if (!professionalId || !slotId || !addressText || !region || !province || !commune) {
            return res.status(400).json({
                error: true,
                message: 'Faltan campos: professionalId, slotId, addressText, region, province (o city legacy), commune',
            });
        }
        const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
        const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
        if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
            return res.status(400).json({ error: true, message: 'lat y lng son obligatorios y deben ser números' });
        }
        const request = await agenda.createAppointmentRequest({
            patientId: patient.id,
            professionalId,
            slotId,
            addressText,
            region,
            province,
            commune,
            lat: latNum,
            lng: lngNum,
            notes,
        });
        res.status(201).json({
            message: 'Solicitud enviada, esperando confirmación del médico.',
            data: { id: request.id, status: request.status },
        });
    }
    catch (e) {
        const msg = e.message || 'Error al crear solicitud';
        console.log('[AGENDA] POST /requests error:', msg);
        res.status(400).json({ error: true, message: msg });
    }
});
// GET /agenda/requests — Profesional lista sus solicitudes; Paciente lista las suyas
router.get('/requests', async (req, res) => {
    try {
        const { status } = req.query;
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (doctor) {
            const where = { professionalId: doctor.id };
            if (status && typeof status === 'string')
                where.status = status;
            const list = await prisma_1.default.appointmentRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    slot: true,
                    payment: true,
                    patient: { include: { user: { select: { firstName: true, lastName: true } } } },
                    professional: { select: { baseLat: true, baseLng: true } },
                },
            });
            // Para el profesional: no exponer addressText completo; solo comuna + distancia
            const safe = await Promise.all(list.map(async (r) => {
                const { addressText: _at, ...rest } = r;
                const eff = await geo.getEffectiveDoctorLocation(r.professionalId);
                let distanceKm = null;
                if (eff.kind !== 'UNKNOWN') {
                    distanceKm = geo
                        .distanceKm({ lat: eff.lat, lng: eff.lng }, { lat: r.lat, lng: r.lng })
                        .toFixed(1);
                }
                return {
                    ...rest,
                    city: r.province,
                    addressDisplay: r.commune,
                    distanceKm,
                    patientLocation: { lat: r.lat, lng: r.lng },
                };
            }));
            return res.json({ data: safe });
        }
        if (patient) {
            const where = { patientId: patient.id };
            if (status && typeof status === 'string')
                where.status = status;
            const list = await prisma_1.default.appointmentRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    slot: true,
                    payment: true,
                    professional: { include: { user: { select: { firstName: true, lastName: true } } } },
                },
            });
            return res.json({
                data: list.map((row) => ({ ...row, city: row.province })),
            });
        }
        return res.status(403).json({ error: true, message: 'Sin perfil' });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// GET /agenda/requests/:id — Detalle (paciente dueño o profesional asignado)
router.get('/requests/:id', async (req, res) => {
    try {
        const r = await prisma_1.default.appointmentRequest.findUnique({
            where: { id: req.params.id },
            include: {
                slot: true,
                payment: true,
                patient: { include: { user: { select: { firstName: true, lastName: true } } } },
                professional: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'No encontrada' });
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        const isDoctor = doctor?.id === r.professionalId;
        const isPatient = patient?.id === r.patientId;
        if (!isDoctor && !isPatient) {
            return res.status(403).json({ error: true, message: 'Sin acceso' });
        }
        // Profesional: no enviar addressText hasta que acepte (MVP: enviamos comuna)
        const out = isDoctor && r.status !== 'CONFIRMED'
            ? { ...r, addressText: undefined, addressDisplay: `${r.commune}` }
            : r;
        res.json({ data: { ...out, city: out.province } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /agenda/requests/:id/accept
router.post('/requests/:id/accept', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
        await agenda.acceptAppointmentRequest(req.params.id, doctor.id);
        res.json({ message: 'Solicitud aceptada', data: { status: 'CONFIRMED' } });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// POST /agenda/requests/:id/reject
router.post('/requests/:id/reject', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
        const { reason, comment } = req.body;
        const validReasons = ['DISTANCIA', 'ZONA', 'HORARIO', 'OTRO'];
        if (!reason || !validReasons.includes(reason)) {
            return res.status(400).json({ error: true, message: 'reason obligatorio: DISTANCIA, ZONA, HORARIO u OTRO' });
        }
        await agenda.rejectAppointmentRequest(req.params.id, doctor.id, reason, comment);
        res.json({ message: 'Solicitud rechazada' });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// GET /agenda/slots — Slots disponibles de un profesional para una fecha
router.get('/slots', async (req, res) => {
    try {
        const { professionalId, date } = req.query;
        if (!professionalId || !date || typeof professionalId !== 'string' || typeof date !== 'string') {
            return res.status(400).json({ error: true, message: 'professionalId y date requeridos' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: true, message: 'date debe ser YYYY-MM-DD' });
        }
        const pro = await prisma_1.default.doctorProfile.findFirst({
            where: { id: professionalId },
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
        });
        if (!pro) {
            // eslint-disable-next-line no-console
            console.warn('[AGENDA SLOTS] professionalId no encontrado (doctorProfile.id distinto a lo que envía el front?)', {
                professionalId,
                date,
            });
            return res.status(404).json({ error: true, message: 'Profesional no encontrado' });
        }
        if (!(0, agendaPricing_1.isValidAgendaBaseFee)(pro.baseFee)) {
            return res.status(400).json({ error: true, message: agendaPricing_1.AGENDA_HOME_VISIT_FEE_ERROR });
        }
        const debug = process.env.NODE_ENV !== 'production';
        const { slots, debug: stats } = await (0, scheduling_service_1.listMaterializedAgendaSlotsForDate)(pro.id, date, { debug });
        if (debug) {
            const now = new Date();
            // eslint-disable-next-line no-console
            console.log('[AGENDA SLOTS DEBUG]', JSON.stringify({
                professionalId: pro.id,
                proLabel: `${pro.user.firstName} ${pro.user.lastName} <${pro.user.email}>`,
                dateReceived: date,
                nowChile: (0, date_fns_tz_1.formatInTimeZone)(now, appointmentBookingRules_1.BOOKING_TIMEZONE, "yyyy-MM-dd'T'HH:mm"),
                ...stats,
                finalReturned: slots.length,
            }, null, 0));
        }
        res.json({ data: slots });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error('[AGENDA SLOTS] error', e);
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
