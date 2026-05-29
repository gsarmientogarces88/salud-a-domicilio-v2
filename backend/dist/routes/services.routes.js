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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const svc = __importStar(require("../services/serviceRequests.service"));
const config_1 = require("../config");
const geo_service_1 = require("../services/geo.service");
const upload_1 = require("../lib/upload");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function buildDoctorSpecialtyLabel(specialty) {
    const raw = (specialty || '').trim();
    if (!raw)
        return 'No informado';
    const lower = raw.toLowerCase();
    if (lower.includes('general'))
        return 'Médico General';
    if (lower.includes('experiencia'))
        return `Médico con experiencia en ${raw}`;
    if (lower.includes('formación') || lower.includes('formacion')) {
        return `Médico con formación complementaria en ${raw}`;
    }
    return `Médico con formación complementaria en ${raw}`;
}
/** Compatibilidad con BD sin columna `serviceType`: inferir desde `type` + descripción. */
function inferServiceRequestServiceType(row) {
    if (row.type === 'SCHEDULED')
        return 'SCHEDULED';
    const d = (row.description || '').toLowerCase();
    if (d.includes('baja de peso'))
        return 'WEIGHT_PROGRAM';
    return 'IMMEDIATE';
}
function mapPaymentMethod(provider) {
    const p = (provider || '').toLowerCase();
    if (!p)
        return 'Pendiente';
    if (p.includes('webpay'))
        return 'Webpay';
    if (p.includes('mercadopago'))
        return 'Webpay';
    if (p.includes('isapre') || p.includes('bono'))
        return 'Bono / Isapre';
    return 'Otro';
}
function mapServiceTypeLabel(serviceType) {
    if (serviceType === 'WEIGHT_PROGRAM')
        return 'Programa Médico Baja de Peso';
    if (serviceType === 'SCHEDULED')
        return 'Agenda Médico a Domicilio';
    return 'Médico a Domicilio Inmediato';
}
/** Alinea estados de cita (agenda) a los que usa el listado y filtros del paciente. */
function mapAppointmentRequestToHistoryStatus(status) {
    switch (status) {
        case 'PENDING':
            return { status: 'PENDING', statusDisplay: 'Pendiente de confirmación' };
        case 'CONFIRMED':
            return { status: 'COMPLETED', statusDisplay: 'Cita confirmada' };
        case 'REJECTED':
        case 'EXPIRED':
            return {
                status: 'CANCELLED',
                statusDisplay: status === 'REJECTED' ? 'Solicitud rechazada' : 'Solicitud expirada',
            };
    }
}
/**
 * Columnas de `service_requests` alineadas a una BD “legacy” (sin `serviceType`, sin boleta, etc.).
 * Evita que Prisma proyecte columnas que existen en el schema pero no en la tabla física.
 */
const SERVICE_REQUEST_DB_SCALAR_SELECT = {
    id: true,
    patientId: true,
    doctorId: true,
    type: true,
    status: true,
    description: true,
    address: true,
    commune: true,
    province: true,
    region: true,
    referencias: true,
    sexo: true,
    telefono: true,
    edadPaciente: true,
    esMenorEdad: true,
    tieneFiebre: true,
    dificultadRespiratoria: true,
    requestLat: true,
    requestLng: true,
    requestLocationCapturedAt: true,
    requestLocationAccuracyMeters: true,
    requestLocationSource: true,
    requestLocationPrecision: true,
    requestLocationConfidence: true,
    totalAmount: true,
    commissionAmount: true,
    doctorNetAmount: true,
    urgentFixedPrice: true,
    scheduledAt: true,
    expiresAt: true,
    startedAt: true,
    completedAt: true,
    cancelledAt: true,
    cancelReason: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    acceptedAt: true,
    queuedAt: true,
};
/** Solo datos seguros del médico: evita `baseLat`/`coverageKm` si no existen en `doctor_profiles`. */
const DOCTOR_FOR_HISTORY_SELECT = {
    specialty: true,
    user: { select: { firstName: true, lastName: true } },
};
const TRANSACTION_FOR_HISTORY_SELECT = {
    orderBy: { createdAt: 'desc' },
    select: {
        id: true,
        provider: true,
        status: true,
        amount: true,
        createdAt: true,
    },
};
// 1) POST /services — Paciente crea solicitud
router.post('/', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_1.default.patientProfile.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
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
        res.status(201).json({ message: 'Solicitud creada', data: { ...sr, city: sr.province } });
    }
    catch (e) {
        if (e?.code === 'OPEN_SERVICE_EXISTS') {
            return res.status(409).json({
                error: true,
                message: e.message,
                data: { openService: e.openService },
            });
        }
        res.status(400).json({ error: true, message: e.message });
    }
});
// 2) GET /services/me — Paciente: mi historial
router.get('/me', (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        // Solo `id`: evita leer columnas del perfil que aún no existen en algunas BD.
        const patient = await prisma_1.default.patientProfile.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil no encontrado' });
        // Select explícito: la tabla real puede no tener columnas nuevas del schema (`serviceType`, boleta, etc.).
        const list = await prisma_1.default.serviceRequest.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            select: {
                ...SERVICE_REQUEST_DB_SCALAR_SELECT,
                doctor: { select: DOCTOR_FOR_HISTORY_SELECT },
                transactions: TRANSACTION_FOR_HISTORY_SELECT,
            },
        });
        const serviceItems = list.map((row) => {
            const doctorName = row.doctor?.user
                ? `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`
                : null;
            const doctorSpecialtyLabel = buildDoctorSpecialtyLabel(row.doctor?.specialty);
            const latestTransaction = row.transactions[0] || null;
            const completedTx = row.transactions.find((x) => x.status === 'COMPLETED') || null;
            // Listado compatible con BD legacy: no proyectamos `baseLat`/`baseLng`/`coverageKm` del médico aquí.
            const computedDistanceKm = null;
            const allowedRadiusKm = null;
            const inferredServiceType = inferServiceRequestServiceType(row);
            return {
                ...row,
                recordKind: 'service',
                city: row.province,
                doctorName,
                doctorSpecialtyLabel,
                requestedAt: row.createdAt,
                estimatedArrivalAt: row.scheduledAt,
                arrivedAt: row.startedAt,
                patientAddress: row.address,
                patientCommune: row.commune,
                distanceKm: computedDistanceKm,
                allowedRadiusKm,
                paymentMethod: mapPaymentMethod(completedTx?.provider ?? latestTransaction?.provider),
                serviceType: inferredServiceType,
                serviceTypeLabel: mapServiceTypeLabel(inferredServiceType),
                // Sin columnas de boleta en BD antigua: siempre pendiente desde el punto de vista del paciente.
                receiptStatus: 'PENDING',
                statusDisplay: null,
            };
        });
        const agendaList = await prisma_1.default.appointmentRequest.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            include: {
                professional: { select: { ...DOCTOR_FOR_HISTORY_SELECT, baseFee: true } },
                slot: { select: { startAt: true, endAt: true } },
                payment: { select: { amount: true, status: true, provider: true } },
            },
        });
        const agendaItems = agendaList.map((ar) => {
            const { status, statusDisplay } = mapAppointmentRequestToHistoryStatus(ar.status);
            const u = ar.professional.user;
            const doctorName = u ? `Dr. ${u.firstName} ${u.lastName}` : null;
            const doctorSpecialtyLabel = buildDoctorSpecialtyLabel(ar.professional.specialty);
            const pay = ar.payment;
            const total = pay?.amount ?? ar.professional.baseFee ?? 0;
            return {
                id: ar.id,
                recordKind: 'agenda',
                type: 'SCHEDULED',
                status,
                statusDisplay,
                description: 'Agenda Médico a Domicilio',
                address: ar.addressText,
                commune: ar.commune,
                province: ar.province,
                region: ar.region,
                totalAmount: total,
                notes: ar.notes,
                createdAt: ar.createdAt,
                city: ar.province,
                doctorName,
                doctorSpecialtyLabel,
                doctor: { user: { firstName: u.firstName, lastName: u.lastName } },
                requestedAt: ar.createdAt,
                estimatedArrivalAt: ar.slot?.startAt ?? ar.createdAt,
                arrivedAt: null,
                serviceType: 'SCHEDULED',
                serviceTypeLabel: 'Agenda Médico a Domicilio',
                paymentMethod: pay ? mapPaymentMethod(pay.provider) : 'Pendiente',
                receiptStatus: 'PENDING',
                appointmentStatus: ar.status,
                distanceKm: null,
                allowedRadiusKm: null,
            };
        });
        const data = [...serviceItems, ...agendaItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ data });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 2b) POST /services/:id/receipt — médico asignado sube boleta
router.post('/:id/receipt', (0, roles_1.authorize)('DOCTOR'), upload_1.receiptUpload.single('receiptFile'), async (req, res) => {
    try {
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId: req.user.id } });
        if (!doctor)
            return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: true, message: 'Debes adjuntar una boleta' });
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.id } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (sr.doctorId !== doctor.id)
            return res.status(403).json({ error: true, message: 'Sin permisos para esta atención' });
        const receiptUrl = `/uploads/receipts/${file.filename}`;
        const updated = await prisma_1.default.serviceRequest.update({
            where: { id: sr.id },
            data: {
                receiptUrl,
                receiptFileName: file.originalname,
                receiptMimeType: file.mimetype,
                receiptUploadedAt: new Date(),
            },
        });
        res.status(201).json({ data: updated });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 2c) GET /services/:id/receipt — descarga segura de boleta para paciente/médico/admin
router.get('/:id/receipt', async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.id } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (!sr.receiptUrl || !sr.receiptFileName) {
            return res.status(404).json({ error: true, message: 'Boleta pendiente de carga por el médico' });
        }
        const role = req.user.role;
        const userId = req.user.id;
        let allowed = role === 'ADMIN';
        if (!allowed && role === 'PATIENT') {
            const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId }, select: { id: true } });
            allowed = patient?.id === sr.patientId;
        }
        if (!allowed && role === 'DOCTOR') {
            const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId }, select: { id: true } });
            allowed = doctor?.id === sr.doctorId;
        }
        if (!allowed)
            return res.status(403).json({ error: true, message: 'Sin acceso' });
        const rel = sr.receiptUrl.replace(/^\/uploads\//, '');
        const abs = path_1.default.join(process.cwd(), 'uploads', rel);
        if (!abs.startsWith(path_1.default.join(process.cwd(), 'uploads'))) {
            return res.status(400).json({ error: true, message: 'Ruta inválida' });
        }
        if (!fs_1.default.existsSync(abs))
            return res.status(404).json({ error: true, message: 'Archivo no encontrado' });
        res.download(abs, sr.receiptFileName);
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
            return res.json({ data: list.map((row) => ({ ...row, city: row.province })) });
        }
        const effective = await (0, geo_service_1.getEffectiveDoctorLocation)(doctor.id);
        const now = new Date();
        const urgentTtlMs = Math.max(1, config_1.config.serviceRequests.urgentPendingTtlMinutes) * 60 * 1000;
        const scheduledTtlMs = Math.max(1, config_1.config.serviceRequests.scheduledPendingTtlMinutes) * 60 * 1000;
        const output = [];
        for (const sr of list) {
            const excluded = [];
            // Expiración por tiempo (robusto incluso si hay data vieja sin expiresAt correcto)
            const ttlMs = sr.type === 'URGENT' ? urgentTtlMs : scheduledTtlMs;
            const cutoff = new Date(now.getTime() - ttlMs);
            const isExpiredByCreatedAt = sr.createdAt <= cutoff;
            const isExpiredByExpiresAt = sr.expiresAt != null && sr.expiresAt <= now;
            if (isExpiredByCreatedAt || isExpiredByExpiresAt)
                excluded.push('EXPIRATION');
            // Distancia solo para urgentes
            let computedDistanceKm = null;
            if (sr.type === 'URGENT') {
                if (sr.requestLat == null || sr.requestLng == null) {
                    excluded.push('DISTANCE_LOCATION_MISSING');
                }
                else if (effective.kind === 'UNKNOWN') {
                    excluded.push('DISTANCE_DOCTOR_LOCATION_MISSING');
                }
                else {
                    computedDistanceKm = (0, geo_service_1.distanceKm)({ lat: effective.lat, lng: effective.lng }, { lat: sr.requestLat, lng: sr.requestLng });
                    if (computedDistanceKm > config_1.config.geo.urgentRadiusKm)
                        excluded.push('DISTANCE');
                }
            }
            if (config_1.config.isDev) {
                // eslint-disable-next-line no-console
                console.log('[services.available.debug]', {
                    id: sr.id,
                    status: sr.status,
                    createdAt: sr.createdAt,
                    expiresAt: sr.expiresAt,
                    type: sr.type,
                    distanceKm: computedDistanceKm == null ? null : Math.round(computedDistanceKm * 10) / 10,
                    excludedByDistance: excluded.includes('DISTANCE'),
                    excludedByDistanceMissing: excluded.includes('DISTANCE_LOCATION_MISSING') || excluded.includes('DISTANCE_DOCTOR_LOCATION_MISSING'),
                    excludedByExpiration: excluded.includes('EXPIRATION'),
                    excludedByRejection: false, // ya excluida en query (rejections: none)
                    excludedByAccepted: false, // ya excluida por status=PENDING y doctorId null/assigned se valida en accept/reject
                });
            }
            if (excluded.length > 0)
                continue;
            const expiresAtMs = sr.expiresAt?.getTime() ?? sr.createdAt.getTime() + (ttlMs > 0 ? ttlMs : urgentTtlMs);
            const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now.getTime()) / 1000));
            output.push({
                ...sr,
                city: sr.province,
                distanceKm: computedDistanceKm == null ? null : Math.round(computedDistanceKm * 10) / 10,
                remainingSeconds,
            });
        }
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.available] filtered count:', output.length, {
                geoFilter: true,
                urgentTtlMin: config_1.config.serviceRequests.urgentPendingTtlMinutes,
                scheduledTtlMin: config_1.config.serviceRequests.scheduledPendingTtlMinutes,
            });
        }
        res.json({ data: output });
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
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.json({ data: list.map((row) => ({ ...row, city: row.province })) });
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
            select: {
                ...SERVICE_REQUEST_DB_SCALAR_SELECT,
                patient: {
                    select: {
                        id: true,
                        user: { select: { firstName: true, lastName: true, phone: true } },
                    },
                },
                doctor: {
                    select: {
                        specialty: true,
                        user: { select: { firstName: true, lastName: true, phone: true } },
                    },
                },
                transactions: TRANSACTION_FOR_HISTORY_SELECT,
            },
        });
        if (!sr)
            return res.status(404).json({ error: true, message: 'No encontrada' });
        // Verificar acceso
        const userId = req.user.id;
        const role = req.user.role;
        const inferredServiceType = inferServiceRequestServiceType(sr);
        const withCity = {
            ...sr,
            city: sr.province,
            serviceType: inferredServiceType,
            serviceTypeLabel: mapServiceTypeLabel(inferredServiceType),
            receiptStatus: 'PENDING',
        };
        if (role === 'ADMIN')
            return res.json({ data: withCity });
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId }, select: { id: true } });
        const doctor = await prisma_1.default.doctorProfile.findUnique({ where: { userId }, select: { id: true } });
        const isOwner = patient?.id === sr.patientId || doctor?.id === sr.doctorId;
        if (!isOwner)
            return res.status(403).json({ error: true, message: 'Sin acceso' });
        res.json({ data: withCity });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 5c) Chat: GET /services/:id/chat — mensajes del chat (solo paciente dueño o médico asignado)
router.get('/:id/chat', async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({
            where: { id: req.params.id },
            select: { id: true, status: true, patientId: true, doctorId: true },
        });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        // Permisos: paciente dueño o doctor asignado
        const userId = req.user.id;
        const role = req.user.role;
        const patient = role === 'PATIENT' ? await prisma_1.default.patientProfile.findUnique({ where: { userId }, select: { id: true } }) : null;
        const doctor = role === 'DOCTOR' ? await prisma_1.default.doctorProfile.findUnique({ where: { userId }, select: { id: true } }) : null;
        const allowed = patient?.id === sr.patientId || (doctor?.id && sr.doctorId === doctor.id);
        if (!allowed)
            return res.status(403).json({ error: true, message: 'Sin acceso al chat' });
        // Chat solo visible cuando ya hay aceptación o atención en curso; en COMPLETED lo dejamos solo lectura
        if (!['ACCEPTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETED'].includes(sr.status)) {
            return res.status(400).json({ error: true, message: 'Chat no disponible en este estado' });
        }
        const messages = await prisma_1.default.serviceChatMessage.findMany({
            where: { serviceRequestId: sr.id },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });
        res.json({ data: { messages, canWrite: ['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(sr.status) } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
const sendChatSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(1).max(1000),
});
// 5d) Chat: POST /services/:id/chat — enviar mensaje (solo paciente dueño o médico asignado)
router.post('/:id/chat', async (req, res) => {
    try {
        const parsed = sendChatSchema.safeParse(req.body ?? {});
        if (!parsed.success)
            return res.status(400).json({ error: true, message: parsed.error.message });
        const sr = await prisma_1.default.serviceRequest.findUnique({
            where: { id: req.params.id },
            select: { id: true, status: true, patientId: true, doctorId: true },
        });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (!['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(sr.status)) {
            return res.status(400).json({ error: true, message: 'Chat no disponible para enviar mensajes en este estado' });
        }
        const userId = req.user.id;
        const role = req.user.role;
        const patient = role === 'PATIENT' ? await prisma_1.default.patientProfile.findUnique({ where: { userId }, select: { id: true } }) : null;
        const doctor = role === 'DOCTOR' ? await prisma_1.default.doctorProfile.findUnique({ where: { userId }, select: { id: true } }) : null;
        const isPatient = patient?.id === sr.patientId;
        const isDoctor = doctor?.id != null && sr.doctorId === doctor.id;
        if (!isPatient && !isDoctor)
            return res.status(403).json({ error: true, message: 'Sin acceso al chat' });
        const created = await prisma_1.default.serviceChatMessage.create({
            data: {
                serviceRequestId: sr.id,
                senderType: isDoctor ? 'DOCTOR' : 'PATIENT',
                senderUserId: userId,
                message: parsed.data.message,
            },
        });
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.chat.send]', { requestId: sr.id, senderType: created.senderType, senderUserId: userId, createdAt: created.createdAt });
        }
        res.status(201).json({ data: created });
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
        const patient = await prisma_1.default.patientProfile.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!patient)
            return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
        const sr = await prisma_1.default.serviceRequest.findUnique({
            where: { id: req.params.id },
            select: { id: true, patientId: true },
        });
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
            select: {
                id: true,
                requestLat: true,
                requestLng: true,
                requestLocationCapturedAt: true,
                requestLocationAccuracyMeters: true,
                requestLocationSource: true,
                requestLocationPrecision: true,
                requestLocationConfidence: true,
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
        if (sr.expiresAt && sr.expiresAt < new Date()) {
            return res.status(400).json({ error: true, message: 'Solicitud expirada' });
        }
        if (sr.doctorId && sr.doctorId !== doctor.id) {
            return res.status(400).json({ error: true, message: 'La solicitud ya fue tomada por otro médico' });
        }
        if (config_1.config.isDev) {
            // eslint-disable-next-line no-console
            console.log('[services.reject] attempt:', { serviceId: sr.id, doctorId: doctor.id, status: sr.status, createdAt: sr.createdAt, expiresAt: sr.expiresAt });
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
        if (config_1.config.debugServiceStateFlow) {
            // eslint-disable-next-line no-console
            console.log('[serviceFlow.http.patchStatus]', {
                serviceId: req.params.id,
                doctorId: doctor.id,
                requestedStatus: status,
            });
        }
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
        if (config_1.config.debugServiceStateFlow) {
            // eslint-disable-next-line no-console
            console.log('[serviceFlow.http.patchStatus.result]', { serviceId: sr.id, resultStatus: sr.status });
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
        res.json({
            data: list.map((row) => ({ ...row, city: row.province })),
            total,
            page: parseInt(page),
        });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
