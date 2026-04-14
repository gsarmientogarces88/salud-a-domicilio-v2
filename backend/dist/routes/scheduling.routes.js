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
const scheduling_service_1 = require("../services/scheduling.service");
const svc = __importStar(require("../services/serviceRequests.service"));
const appointmentBookingRules_1 = require("../lib/appointmentBookingRules");
const territoryCompat_1 = require("../lib/territoryCompat");
const router = (0, express_1.Router)();
// Todas las rutas requieren usuario autenticado
router.use(auth_1.authenticate);
// Obtener configuración de agenda del profesional autenticado
router.get('/me', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const profile = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
        }
        const data = await (0, scheduling_service_1.getScheduleForProfessional)(profile.id);
        res.json({ data });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// Guardar configuración de agenda del profesional autenticado
router.put('/me', (0, roles_1.authorize)('DOCTOR'), async (req, res) => {
    try {
        const profile = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
        }
        const { availability = [], blockedSlots = [] } = req.body;
        const data = await (0, scheduling_service_1.setScheduleForProfessional)(profile.id, availability || [], blockedSlots || []);
        res.json({ message: 'Agenda actualizada', data });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// Obtener slots disponibles para un profesional en una fecha concreta
router.get('/slots/:professionalId', async (req, res) => {
    try {
        const { professionalId } = req.params;
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: true, message: 'Parámetro date requerido (YYYY-MM-DD)' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: true, message: 'date debe ser YYYY-MM-DD' });
        }
        const slots = await (0, scheduling_service_1.getAvailableSlotsForDate)(professionalId, date);
        res.json({ data: { slots } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// Crear reserva (Appointment) verificando disponibilidad
router.post('/book', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient) {
            return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
        }
        const body = req.body;
        const { professionalId, description, address, commune, scheduledAt } = body;
        const province = (0, territoryCompat_1.coalesceProvinceFromPayload)(body);
        if (!professionalId) {
            return res.status(400).json({ error: true, message: 'professionalId requerido' });
        }
        if (!description || !address) {
            return res.status(400).json({ error: true, message: 'Descripción y dirección son obligatorias' });
        }
        if (!scheduledAt) {
            return res.status(400).json({ error: true, message: 'scheduledAt es obligatorio' });
        }
        const start = new Date(scheduledAt);
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ error: true, message: 'scheduledAt inválido' });
        }
        if (start.getTime() <= Date.now()) {
            return res.status(400).json({ error: true, message: 'No se pueden agendar horas en el pasado' });
        }
        try {
            (0, appointmentBookingRules_1.assertBookingSlotAllowed)(start, new Date());
        }
        catch (err) {
            return res.status(400).json({ error: true, message: err.message || 'Fecha u hora no permitida' });
        }
        const available = await (0, scheduling_service_1.isSlotAvailable)(professionalId, start);
        if (!available) {
            return res
                .status(400)
                .json({ error: true, message: 'El horario seleccionado ya no está disponible. Elige otra hora.' });
        }
        const request = await svc.createRequest({
            patientId: patient.id,
            type: 'SCHEDULED',
            description,
            address,
            commune,
            province: province || undefined,
            doctorId: professionalId,
            scheduledAt: start,
        });
        res.status(201).json({
            message: 'Reserva creada correctamente',
            data: { ...request, city: request.province },
        });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
exports.default = router;
