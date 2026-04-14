"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const upload_1 = require("../lib/upload");
const labExamHelpers_1 = require("../services/labExamHelpers");
const labNotifications_service_1 = require("../services/labNotifications.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, roles_1.authorize)('LABORATORY'));
async function labFromReq(req) {
    return prisma_1.default.laboratory.findUnique({ where: { userId: req.user.id } });
}
function buildCoverageWhere(lab) {
    return {
        OR: [{ commune: lab.commune ?? undefined }, { province: lab.province ?? undefined }, { region: lab.region ?? undefined }].filter((x) => Object.values(x)[0]),
    };
}
function mapLabRequest(r) {
    const ownQuote = (r.quotes || [])[0] || null;
    return {
        id: r.id,
        displayId: (0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber),
        status: r.status,
        patientName: r.patientName,
        examRequested: r.examRequested,
        address: r.address,
        region: r.region,
        province: r.province,
        commune: r.commune,
        phone: r.phone,
        email: r.email,
        observationsPatient: r.observationsPatient,
        preferredDate: r.preferredDate,
        preferredTimeRange: r.preferredTimeRange,
        latitude: r.latitude,
        longitude: r.longitude,
        quoteDeadlineAt: r.quoteDeadlineAt,
        selectedQuoteId: r.selectedQuoteId,
        orderFileUrl: r.orderFileUrl,
        orderFileName: r.orderFileName,
        ownQuote,
        appointments: (r.appointments || []).map((a) => ({
            id: a.id,
            startAt: a.startAt,
            endAt: a.endAt,
            status: a.status,
            notes: a.notes,
        })),
        results: (r.results || []).map((x) => ({
            id: x.id,
            fileName: x.fileName,
            fileUrl: x.fileUrl,
            observations: x.observations,
            published: x.published,
            publishedAt: x.publishedAt,
        })),
        events: (r.events || []).map((e) => ({
            id: e.id,
            kind: e.kind,
            message: e.message,
            createdAt: e.createdAt,
        })),
        patient: r.patient?.user
            ? {
                email: r.patient.user.email,
                firstName: r.patient.user.firstName,
                lastName: r.patient.user.lastName,
            }
            : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
router.get('/dashboard', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const coverageWhere = buildCoverageWhere(lab);
        const [pendingQuotes, quotedByMe, selectedByMe, scheduled, resultsReady] = await Promise.all([
            prisma_1.default.labExamRequest.count({ where: { ...coverageWhere, status: 'PENDING_QUOTES' } }),
            prisma_1.default.labQuote.count({ where: { laboratoryId: lab.id, status: 'SENT' } }),
            prisma_1.default.labQuote.count({ where: { laboratoryId: lab.id, status: 'ACCEPTED' } }),
            prisma_1.default.labAppointment.count({ where: { laboratoryId: lab.id, request: { status: 'SCHEDULED' } } }),
            prisma_1.default.labAppointment.count({ where: { laboratoryId: lab.id, request: { status: 'RESULTS_READY' } } }),
        ]);
        res.json({ data: { counts: { pendingQuotes, quotedByMe, selectedByMe, scheduled, resultsReady }, laboratory: { id: lab.id, name: lab.name } } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.get('/requests', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const status = req.query.status;
        const coverageWhere = buildCoverageWhere(lab);
        const list = await prisma_1.default.labExamRequest.findMany({
            where: {
                ...(status ? { status: status } : {}),
                AND: [
                    {
                        OR: [
                            { quotes: { some: { laboratoryId: lab.id } } },
                            { selectedQuote: { laboratoryId: lab.id } },
                            { appointments: { some: { laboratoryId: lab.id } } },
                            {
                                AND: [
                                    coverageWhere,
                                    { status: { in: ['PENDING_QUOTES', 'QUOTED'] } },
                                ],
                            },
                        ],
                    },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                quotes: { where: { laboratoryId: lab.id }, orderBy: { createdAt: 'desc' }, take: 1 },
                selectedQuote: true,
                appointments: { where: { laboratoryId: lab.id }, orderBy: { startAt: 'desc' }, take: 1 },
                results: true,
                patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
            },
        });
        res.json({ data: list.map(mapLabRequest) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.get('/requests/:id', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const coverageWhere = buildCoverageWhere(lab);
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: {
                id: req.params.id,
                OR: [
                    { quotes: { some: { laboratoryId: lab.id } } },
                    { selectedQuote: { laboratoryId: lab.id } },
                    { appointments: { some: { laboratoryId: lab.id } } },
                    coverageWhere,
                ],
            },
            include: {
                quotes: { where: { laboratoryId: lab.id }, orderBy: { createdAt: 'desc' }, take: 1 },
                selectedQuote: true,
                appointments: { where: { laboratoryId: lab.id }, orderBy: { startAt: 'desc' } },
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
                patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
            },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        res.json({ data: mapLabRequest(r) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/requests/:id/quote', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const { priceClp, proposedDate, proposedTimeRange, comment, estimatedResultsHours } = req.body;
        if (typeof priceClp !== 'number' || priceClp <= 0)
            return res.status(400).json({ error: true, message: 'Precio inválido' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, ...buildCoverageWhere(lab), status: { in: ['PENDING_QUOTES', 'QUOTED'] } },
            include: { quotes: { where: { laboratoryId: lab.id } } },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada o no disponible para cotizar' });
        if (r.quoteDeadlineAt.getTime() < Date.now())
            return res.status(400).json({ error: true, message: 'Plazo de cotización vencido' });
        if (r.selectedQuoteId)
            return res.status(400).json({ error: true, message: 'La solicitud ya tiene laboratorio seleccionado' });
        await prisma_1.default.$transaction(async (tx) => {
            await tx.labQuote.upsert({
                where: { requestId_laboratoryId: { requestId: r.id, laboratoryId: lab.id } },
                create: {
                    requestId: r.id,
                    laboratoryId: lab.id,
                    status: 'SENT',
                    priceClp,
                    proposedDate: proposedDate ? new Date(proposedDate) : null,
                    proposedTimeRange: proposedTimeRange ? String(proposedTimeRange) : null,
                    comment: comment ? String(comment) : null,
                    estimatedResultsHours: typeof estimatedResultsHours === 'number' ? estimatedResultsHours : null,
                },
                update: {
                    status: 'SENT',
                    priceClp,
                    proposedDate: proposedDate ? new Date(proposedDate) : null,
                    proposedTimeRange: proposedTimeRange ? String(proposedTimeRange) : null,
                    comment: comment ? String(comment) : null,
                    estimatedResultsHours: typeof estimatedResultsHours === 'number' ? estimatedResultsHours : null,
                },
            });
            await tx.labExamRequest.update({ where: { id: r.id }, data: { status: 'QUOTED' } });
        });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'QUOTE_SENT', `${lab.name} envió cotización por $${priceClp.toLocaleString('es-CL')} CLP`);
        const uid = await (0, labExamHelpers_1.getPatientUserId)(r.patientId);
        if (uid)
            await (0, labNotifications_service_1.notifyUser)(uid, 'LAB_QUOTED', 'Nueva cotización disponible', `Recibiste una cotización para ${(0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber)}.`, `/dashboard/patient/examenes-domicilio`);
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: r.id },
            include: {
                quotes: { where: { laboratoryId: lab.id }, orderBy: { createdAt: 'desc' }, take: 1 },
                selectedQuote: true,
                appointments: { where: { laboratoryId: lab.id }, orderBy: { startAt: 'desc' } },
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
                patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
            },
        });
        res.json({ data: mapLabRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/requests/:id/schedule', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const { startAt, endAt, notes } = req.body;
        if (!startAt)
            return res.status(400).json({ error: true, message: 'startAt requerido' });
        const r = await prisma_1.default.labExamRequest.findFirst({
            where: { id: req.params.id, selectedQuote: { laboratoryId: lab.id }, status: 'LAB_SELECTED' },
        });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada o no seleccionada para tu laboratorio' });
        const start = new Date(startAt);
        const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);
        await prisma_1.default.$transaction(async (tx) => {
            await tx.labAppointment.create({ data: { requestId: r.id, laboratoryId: lab.id, startAt: start, endAt: end, notes: notes ? String(notes) : null } });
            await tx.labExamRequest.update({ where: { id: r.id }, data: { status: 'SCHEDULED' } });
        });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'SCHEDULED', `Visita agendada: ${start.toISOString()}`);
        const uid = await (0, labExamHelpers_1.getPatientUserId)(r.patientId);
        if (uid)
            await (0, labNotifications_service_1.notifyUser)(uid, 'LAB_SCHEDULED', 'Visita agendada', `Se agendó la toma de muestras para ${(0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber)}.`, `/dashboard/patient/examenes-domicilio`);
        const full = await prisma_1.default.labExamRequest.findUnique({
            where: { id: r.id },
            include: {
                quotes: { where: { laboratoryId: lab.id }, orderBy: { createdAt: 'desc' }, take: 1 },
                selectedQuote: true,
                appointments: { where: { laboratoryId: lab.id }, orderBy: { startAt: 'desc' } },
                results: true,
                events: { orderBy: { createdAt: 'asc' } },
                patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
            },
        });
        res.json({ data: mapLabRequest(full) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.patch('/appointments/:appointmentId', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const ap = await prisma_1.default.labAppointment.findFirst({ where: { id: req.params.appointmentId, laboratoryId: lab.id } });
        if (!ap)
            return res.status(404).json({ error: true, message: 'Cita no encontrada' });
        const { startAt, endAt, notes, status } = req.body;
        const data = {};
        if (startAt)
            data.startAt = new Date(startAt);
        if (endAt)
            data.endAt = new Date(endAt);
        if (notes !== undefined)
            data.notes = String(notes);
        if (status && ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(status))
            data.status = status;
        await prisma_1.default.labAppointment.update({ where: { id: ap.id }, data });
        await (0, labExamHelpers_1.addLabEvent)(ap.requestId, 'RESCHEDULED', 'Cita actualizada');
        res.json({ data: { ok: true } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/requests/:id/sample-collected', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({ where: { id: req.params.id, selectedQuote: { laboratoryId: lab.id } } });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (r.status !== 'SCHEDULED')
            return res.status(400).json({ error: true, message: 'La muestra solo se registra con visita agendada' });
        await prisma_1.default.labExamRequest.update({ where: { id: r.id }, data: { status: 'SAMPLE_COLLECTED' } });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'SAMPLE_COLLECTED', 'Muestra tomada');
        res.json({ data: { ok: true } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/requests/:id/results', upload_1.resultUpload.single('file'), async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: true, message: 'Archivo requerido' });
        const observations = req.body?.observations ? String(req.body.observations) : null;
        const publish = req.body?.publish === 'true' || req.body?.publish === true;
        const r = await prisma_1.default.labExamRequest.findFirst({ where: { id: req.params.id, selectedQuote: { laboratoryId: lab.id } } });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (!['SCHEDULED', 'SAMPLE_COLLECTED'].includes(r.status))
            return res.status(400).json({ error: true, message: 'Resultados solo tras visita o muestra' });
        const fileUrl = `/uploads/lab/results/${file.filename}`;
        const created = await prisma_1.default.labResult.create({
            data: { requestId: r.id, fileUrl, fileName: file.originalname, mimeType: file.mimetype, observations, published: publish, publishedAt: publish ? new Date() : null },
        });
        if (publish) {
            await prisma_1.default.labExamRequest.update({ where: { id: r.id }, data: { status: 'RESULTS_READY' } });
            await (0, labExamHelpers_1.addLabEvent)(r.id, 'RESULTS_READY', 'Resultados publicados');
            const uid = await (0, labExamHelpers_1.getPatientUserId)(r.patientId);
            if (uid)
                await (0, labNotifications_service_1.notifyUser)(uid, 'LAB_RESULTS', 'Resultados disponibles', `Ya puedes descargar los resultados de ${(0, labExamHelpers_1.formatLabDisplayId)(r.displayNumber)}.`, `/dashboard/patient/examenes-domicilio`);
        }
        else {
            await (0, labExamHelpers_1.addLabEvent)(r.id, 'RESULT_UPLOADED', 'Resultado cargado (borrador)');
        }
        res.status(201).json({ data: { result: created } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/results/:resultId/publish', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const result = await prisma_1.default.labResult.findFirst({
            where: { id: req.params.resultId, request: { selectedQuote: { laboratoryId: lab.id } } },
            include: { request: { select: { id: true, patientId: true, displayNumber: true } } },
        });
        if (!result)
            return res.status(404).json({ error: true, message: 'Resultado no encontrado' });
        await prisma_1.default.labResult.update({ where: { id: result.id }, data: { published: true, publishedAt: new Date() } });
        await prisma_1.default.labExamRequest.update({ where: { id: result.requestId }, data: { status: 'RESULTS_READY' } });
        await (0, labExamHelpers_1.addLabEvent)(result.requestId, 'RESULTS_READY', 'Resultados publicados');
        const uid = await (0, labExamHelpers_1.getPatientUserId)(result.request.patientId);
        if (uid)
            await (0, labNotifications_service_1.notifyUser)(uid, 'LAB_RESULTS', 'Resultados disponibles', `Ya puedes descargar tus exámenes (${(0, labExamHelpers_1.formatLabDisplayId)(result.request.displayNumber)}).`, `/dashboard/patient/examenes-domicilio`);
        res.json({ data: { ok: true } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/requests/:id/complete', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const r = await prisma_1.default.labExamRequest.findFirst({ where: { id: req.params.id, selectedQuote: { laboratoryId: lab.id } } });
        if (!r)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        if (r.status !== 'RESULTS_READY')
            return res.status(400).json({ error: true, message: 'Solo se completa tras resultados listos' });
        await prisma_1.default.labExamRequest.update({ where: { id: r.id }, data: { status: 'COMPLETED' } });
        await (0, labExamHelpers_1.addLabEvent)(r.id, 'COMPLETED', 'Atención completada');
        res.json({ data: { ok: true } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.get('/calendar', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const from = req.query.from ? new Date(String(req.query.from)) : new Date();
        const to = req.query.to ? new Date(String(req.query.to)) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [appointments, blocked] = await Promise.all([
            prisma_1.default.labAppointment.findMany({
                where: { laboratoryId: lab.id, startAt: { gte: from, lte: to } },
                orderBy: { startAt: 'asc' },
                include: { request: { select: { id: true, displayNumber: true, patientName: true, status: true } } },
            }),
            prisma_1.default.labBlockedSlot.findMany({
                where: { laboratoryId: lab.id, date: { gte: from, lte: to } },
                orderBy: { date: 'asc' },
            }),
        ]);
        res.json({ data: { appointments, blocked } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.post('/blocked-slots', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const { date, startTime, endTime, reason } = req.body;
        if (!date || !startTime || !endTime)
            return res.status(400).json({ error: true, message: 'date, startTime y endTime requeridos' });
        const created = await prisma_1.default.labBlockedSlot.create({
            data: { laboratoryId: lab.id, date: new Date(date), startTime: String(startTime), endTime: String(endTime), reason: reason ? String(reason) : null },
        });
        res.status(201).json({ data: created });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.delete('/blocked-slots/:id', async (req, res) => {
    try {
        const lab = await labFromReq(req);
        if (!lab)
            return res.status(400).json({ error: true, message: 'Perfil de laboratorio no encontrado' });
        const del = await prisma_1.default.labBlockedSlot.deleteMany({ where: { id: req.params.id, laboratoryId: lab.id } });
        if (del.count === 0)
            return res.status(404).json({ error: true, message: 'Bloqueo no encontrado' });
        res.json({ message: 'Eliminado' });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
