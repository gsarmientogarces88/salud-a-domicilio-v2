"use strict";
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
const upload_1 = require("../lib/upload");
const labExamHelpers_1 = require("../services/labExamHelpers");
const labNotifications_service_1 = require("../services/labNotifications.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, roles_1.authorize)('PATIENT'));
async function getPatientProfileId(req) {
    const p = await prisma_1.default.patientProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
    });
    return p?.id ?? null;
}
function mapRequest(r) {
    const quote = r.quote
        ? {
            id: r.quote.id,
            priceClp: r.quote.priceClp,
            proposedVisitAt: r.quote.proposedVisitAt,
            proposedVisitEndAt: r.quote.proposedVisitEndAt,
            labObservations: r.quote.labObservations,
            estimatedResultsHours: r.quote.estimatedResultsHours,
        }
        : null;
    const appointments = (r.appointments || []).map((a) => ({
        id: a.id,
        startAt: a.startAt,
        endAt: a.endAt,
        status: a.status,
        notes: a.notes,
    }));
    const results = (r.results || []).map((x) => ({
        id: x.id,
        fileName: x.fileName,
        fileUrl: x.fileUrl,
        observations: x.observations,
        published: x.published,
        publishedAt: x.publishedAt,
    }));
    return {
        id: r.id,
        displayId: (0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber),
        status: r.status,
        patientName: r.patientName,
        examRequested: r.examRequested,
        address: r.address,
        commune: r.commune,
        phone: r.phone,
        observationsPatient: r.observationsPatient,
        preferredTime: r.preferredTime,
        orderFileUrl: r.orderFileUrl,
        orderFileName: r.orderFileName,
        labRejectionReason: r.labRejectionReason,
        laboratory: r.laboratory
            ? { id: r.laboratory.id, name: r.laboratory.name, phone: r.laboratory.phone }
            : null,
        quote,
        appointments,
        results,
        events: (r.events || []).map((e) => ({
            id: e.id,
            kind: e.kind,
            message: e.message,
            createdAt: e.createdAt,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
// GET /patient/lab-exams
router.get('/', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const list = await prisma_1.default.labExamRequest.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: {
                laboratory: { select: { id: true, name: true, phone: true } },
                quote: true,
                appointments: { orderBy: { startAt: 'desc' } },
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.json({ data: list.map(mapRequest) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// GET /patient/lab-exams/:id
router.get('/:id', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, patientId },
            include: {
                laboratory: { select: { id: true, name: true, phone: true, commune: true } },
                quote: true,
                appointments: { orderBy: { startAt: 'desc' } },
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        res.json({ data: mapRequest(r) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /patient/lab-exams — multipart: orderFile + campos
router.post('/', upload_1.orderUpload.single('orderFile'), async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: true, message: 'Debes adjuntar la orden médica' });
        const { laboratoryId, patientName, examRequested, address, commune, phone, observationsPatient, preferredTime, } = req.body;
        if (!laboratoryId || !patientName || !examRequested || !address || !commune || !phone) {
            return res.status(400).json({
                error: true,
                message: 'Campos requeridos: laboratoryId, patientName, examRequested, address, commune, phone',
            });
        }
        const lab = await prisma_1.default.laboratory.findUnique({ where: { id: laboratoryId } });
        if (!lab)
            return res.status(400).json({ error: true, message: 'Laboratorio no válido' });
        const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
        const resolvedName = typeof patientName === 'string' && patientName.trim()
            ? patientName.trim()
            : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
        const relative = `orders/${file.filename}`;
        const orderFileUrl = `/uploads/lab/${relative}`;
        const created = await prisma_1.default.labExamRequest.create({
            data: {
                patientId,
                laboratoryId,
                patientName: resolvedName,
                examRequested: String(examRequested).trim(),
                address: String(address).trim(),
                commune: String(commune).trim(),
                phone: String(phone).trim(),
                observationsPatient: observationsPatient ? String(observationsPatient).trim() : null,
                preferredTime: preferredTime ? String(preferredTime).trim() : null,
                orderFileUrl,
                orderFileName: file.originalname,
            },
            include: { laboratory: true },
        });
        await (0, labExamHelpers_1.addLabEvent)(created.id, 'REQUEST_CREATED', 'Solicitud enviada');
        await (0, labExamHelpers_1.addLabEvent)(created.id, 'ORDER_RECEIVED', 'Orden médica recibida');
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: created.id },
            include: {
                laboratory: { select: { id: true, name: true, phone: true } },
                quote: true,
                appointments: true,
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.status(201).json({ data: mapRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /patient/lab-exams/:id/accept-quote
router.post('/:id/accept-quote', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, patientId },
            include: { quote: true },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (r.status !== 'QUOTED' || !r.quote) {
            return res.status(400).json({ error: true, message: 'No hay cotización activa para aceptar' });
        }
        await prisma_1.default.labExamRequest.update({
            where: { id: r.id },
            data: { status: 'PATIENT_ACCEPTED' },
        });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'QUOTE_ACCEPTED', 'Cotización aceptada por el paciente');
        const uid = await (0, labExamHelpers_1.getPatientUserId)(patientId);
        if (uid) {
            await (0, labNotifications_service_1.notifyUser)(uid, 'LAB_QUOTE', 'Cotización aceptada', `Aceptaste la cotización ${(0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber)}. El laboratorio coordinará la visita.`, `/dashboard/patient/examenes-domicilio`);
        }
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: r.id },
            include: {
                laboratory: { select: { id: true, name: true, phone: true } },
                quote: true,
                appointments: true,
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.json({ data: mapRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /patient/lab-exams/:id/reject-quote
router.post('/:id/reject-quote', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, patientId },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (r.status !== 'QUOTED') {
            return res.status(400).json({ error: true, message: 'Solo puedes rechazar cuando hay cotización' });
        }
        await prisma_1.default.labExamRequest.update({
            where: { id: r.id },
            data: { status: 'CANCELLED' },
        });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'QUOTE_REJECTED', 'Cotización rechazada por el paciente');
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: r.id },
            include: {
                laboratory: { select: { id: true, name: true, phone: true } },
                quote: true,
                appointments: true,
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.json({ data: mapRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /patient/lab-exams/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, patientId },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status)) {
            return res.status(400).json({ error: true, message: 'No se puede cancelar en este estado' });
        }
        await prisma_1.default.labExamRequest.update({
            where: { id: r.id },
            data: { status: 'CANCELLED' },
        });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'CANCELLED', req.body?.reason ? `Cancelada: ${req.body.reason}` : 'Solicitud cancelada por el paciente');
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: r.id },
            include: {
                laboratory: { select: { id: true, name: true, phone: true } },
                quote: true,
                appointments: true,
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.json({ data: mapRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// GET /patient/lab-exams/:requestId/result-file/:resultId — descarga segura
router.get('/:requestId/result-file/:resultId', async (req, res) => {
    try {
        const patientId = await getPatientProfileId(req);
        if (!patientId)
            return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });
        const { requestId, resultId } = req.params;
        const result = await prisma_1.default.labResult.findFirst({
            where: {
                id: resultId,
                requestId,
                request: { patientId },
                published: true,
            },
        });
        if (!result)
            return res.status(404).json({ error: true, message: 'Resultado no disponible' });
        const rel = result.fileUrl.replace(/^\/uploads\//, '');
        const abs = path_1.default.join(process.cwd(), 'uploads', rel);
        if (!abs.startsWith(path_1.default.join(process.cwd(), 'uploads'))) {
            return res.status(400).json({ error: true, message: 'Ruta inválida' });
        }
        if (!fs_1.default.existsSync(abs))
            return res.status(404).json({ error: true, message: 'Archivo no encontrado' });
        res.download(abs, result.fileName);
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
