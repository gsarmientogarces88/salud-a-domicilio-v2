import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import { orderUpload } from '../lib/upload';
import { addLabEvent, formatLabDisplayId, getPatientUserId } from '../services/labExamHelpers';
import { notifyUser } from '../services/labNotifications.service';
import { config } from '../config';

const router = Router();

router.use(authenticate, authorize('PATIENT'));

async function getPatientProfileId(req: Request): Promise<string | null> {
  const p = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.id },
    select: { id: true },
  });
  return p?.id ?? null;
}

function mapRequest(r: any) {
  const selectedQuote = r.selectedQuote
    ? {
        id: r.selectedQuote.id,
        status: r.selectedQuote.status,
        laboratory: r.selectedQuote.laboratory
          ? {
              id: r.selectedQuote.laboratory.id,
              name: r.selectedQuote.laboratory.name,
              phone: r.selectedQuote.laboratory.phone,
            }
          : null,
        priceClp: r.selectedQuote.priceClp,
        proposedDate: r.selectedQuote.proposedDate,
        proposedTimeRange: r.selectedQuote.proposedTimeRange,
        comment: r.selectedQuote.comment,
        estimatedResultsHours: r.selectedQuote.estimatedResultsHours,
        createdAt: r.selectedQuote.createdAt,
      }
    : null;

  const appointments = (r.appointments || []).map((a: any) => ({
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    notes: a.notes,
  }));

  const results = (r.results || []).map((x: any) => ({
    id: x.id,
    fileName: x.fileName,
    fileUrl: x.fileUrl,
    observations: x.observations,
    published: x.published,
    publishedAt: x.publishedAt,
  }));

  return {
    id: r.id,
    displayId: formatLabDisplayId(r.displayNumber),
    status: r.status,
    patientName: r.patientName,
    examRequested: r.examRequested,
    address: r.address,
    commune: r.commune,
    phone: r.phone,
    observationsPatient: r.observationsPatient,
    region: r.region,
    province: r.province,
    email: r.email,
    preferredDate: r.preferredDate,
    preferredTimeRange: r.preferredTimeRange,
    latitude: r.latitude,
    longitude: r.longitude,
    quoteDeadlineAt: r.quoteDeadlineAt,
    selectedQuoteId: r.selectedQuoteId,
    orderFileUrl: r.orderFileUrl,
    orderFileName: r.orderFileName,
    labRejectionReason: r.labRejectionReason,
    selectedQuote,
    quotes: (r.quotes || []).map((q: any) => ({
      id: q.id,
      status: q.status,
      laboratory: q.laboratory
        ? { id: q.laboratory.id, name: q.laboratory.name, phone: q.laboratory.phone }
        : null,
      priceClp: q.priceClp,
      proposedDate: q.proposedDate,
      proposedTimeRange: q.proposedTimeRange,
      comment: q.comment,
      estimatedResultsHours: q.estimatedResultsHours,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })),
    appointments,
    results,
    events: (r.events || []).map((e: any) => ({
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const list = await prisma.labExamRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true } } } },
        quotes: { include: { laboratory: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
        appointments: { orderBy: { startAt: 'desc' } },
        results: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ data: list.map(mapRequest) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// GET /patient/lab-exams/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const r = await prisma.labExamRequest.findFirst({
      where: { id: req.params.id, patientId },
      include: {
        selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true, commune: true } } } },
        quotes: { include: { laboratory: { select: { id: true, name: true, phone: true, commune: true } } }, orderBy: { createdAt: 'asc' } },
        appointments: { orderBy: { startAt: 'desc' } },
        results: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!r) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    res.json({ data: mapRequest(r) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /patient/lab-exams — multipart: orderFile + campos
router.post(
  '/',
  orderUpload.single('orderFile'),
  async (req: Request, res: Response) => {
    try {
      const patientId = await getPatientProfileId(req);
      if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

      const file = req.file;
      if (!file) return res.status(400).json({ error: true, message: 'Debes adjuntar la orden médica' });

      const {
        patientName,
        examRequested,
        address,
        region,
        province,
        commune,
        phone,
        email,
        observationsPatient,
        preferredDate,
        preferredTimeRange,
        latitude,
        longitude,
      } = req.body;

      if (!patientName || !examRequested || !address || !region || !province || !commune || !phone || !email) {
        return res.status(400).json({
          error: true,
          message:
            'Campos requeridos: patientName, examRequested, address, region, province, commune, phone, email',
        });
      }
      const lat = latitude != null && String(latitude).trim() ? Number(latitude) : null;
      const lng = longitude != null && String(longitude).trim() ? Number(longitude) : null;
      if ((lat != null && !Number.isFinite(lat)) || (lng != null && !Number.isFinite(lng))) {
        return res.status(400).json({ error: true, message: 'Coordenadas inválidas' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const resolvedName =
        typeof patientName === 'string' && patientName.trim()
          ? patientName.trim()
          : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

      const relative = `orders/${file.filename}`;
      const orderFileUrl = `/uploads/lab/${relative}`;

      const quoteDeadlineMinutes = Math.max(1, config.labExams.quoteDeadlineMinutes);
      const quoteDeadlineAt = new Date(Date.now() + quoteDeadlineMinutes * 60 * 1000);

      const created = await prisma.labExamRequest.create({
        data: {
          patientId,
          status: 'PENDING_QUOTES',
          patientName: resolvedName,
          examRequested: String(examRequested).trim(),
          address: String(address).trim(),
          region: String(region).trim(),
          province: String(province).trim(),
          commune: String(commune).trim(),
          phone: String(phone).trim(),
          email: String(email).trim().toLowerCase(),
          observationsPatient: observationsPatient ? String(observationsPatient).trim() : null,
          preferredDate: preferredDate ? new Date(String(preferredDate)) : null,
          preferredTimeRange: preferredTimeRange ? String(preferredTimeRange).trim() : null,
          latitude: lat,
          longitude: lng,
          orderFileUrl,
          orderFileName: file.originalname,
          quoteDeadlineAt,
        },
      });

      const compatibleLabs = await prisma.laboratory.findMany({
        where: {
          OR: [{ commune: String(commune).trim() }, { province: String(province).trim() }, { region: String(region).trim() }],
        },
        select: { id: true },
      });

      await addLabEvent(created.id, 'REQUEST_CREATED', 'Solicitud enviada');
      await addLabEvent(created.id, 'ORDER_RECEIVED', 'Orden médica recibida');
      await addLabEvent(
        created.id,
        'QUOTE_WINDOW_OPEN',
        `Cotizaciones abiertas por ${quoteDeadlineMinutes} minutos (${compatibleLabs.length} laboratorio(s) compatible(s)).`
      );

      const full = await prisma.labExamRequest.findUnique({
        where: { id: created.id },
        include: {
          selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true } } } },
          quotes: { include: { laboratory: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
          appointments: true,
          results: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      res.status(201).json({ data: mapRequest(full!) });
    } catch (e: any) {
      res.status(500).json({ error: true, message: e.message });
    }
  }
);

// POST /patient/lab-exams/:id/accept-quote
router.post('/:id/accept-quote', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const quoteId = String(req.body?.quoteId || '').trim();
    if (!quoteId) return res.status(400).json({ error: true, message: 'quoteId es requerido' });

    const r = await prisma.labExamRequest.findFirst({
      where: { id: req.params.id, patientId },
      include: { quotes: true },
    });
    if (!r) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (!['PENDING_QUOTES', 'QUOTED'].includes(r.status)) {
      return res.status(400).json({ error: true, message: 'La solicitud no está en etapa de cotizaciones' });
    }
    if (r.selectedQuoteId) {
      return res.status(400).json({ error: true, message: 'Ya existe una cotización seleccionada' });
    }
    if (new Date(r.quoteDeadlineAt).getTime() < Date.now() && r.quotes.length === 0) {
      return res.status(400).json({ error: true, message: 'El plazo de cotización ya expiró' });
    }

    const selected = r.quotes.find((q) => q.id === quoteId);
    if (!selected || selected.status !== 'SENT') {
      return res.status(400).json({ error: true, message: 'Cotización no válida para aceptar' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.labExamRequest.update({
        where: { id: r.id },
        data: { status: 'LAB_SELECTED', selectedQuoteId: selected.id },
      });
      await tx.labQuote.update({
        where: { id: selected.id },
        data: { status: 'ACCEPTED' },
      });
      await tx.labQuote.updateMany({
        where: { requestId: r.id, id: { not: selected.id }, status: 'SENT' },
        data: { status: 'REJECTED' },
      });
    });
    await addLabEvent(r.id, 'QUOTE_ACCEPTED', 'Cotización aceptada por el paciente');

    const uid = await getPatientUserId(patientId);
    if (uid) {
      await notifyUser(
        uid,
        'LAB_QUOTE',
        'Cotización aceptada',
        `Aceptaste una cotización de ${formatLabDisplayId(r.displayNumber)}. El laboratorio coordinará la visita.`,
        `/dashboard/patient/examenes-domicilio`
      );
    }

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true } } } },
        quotes: { include: { laboratory: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
        appointments: true,
        results: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ data: mapRequest(full!) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /patient/lab-exams/:id/reject-quote
router.post('/:id/reject-quote', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const r = await prisma.labExamRequest.findFirst({
      where: { id: req.params.id, patientId },
    });
    if (!r) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (!['PENDING_QUOTES', 'QUOTED'].includes(r.status)) {
      return res.status(400).json({ error: true, message: 'No hay cotizaciones en curso para rechazar' });
    }

    await prisma.labQuote.updateMany({
      where: { requestId: r.id, status: 'SENT' },
      data: { status: 'REJECTED' },
    });
    await addLabEvent(r.id, 'QUOTE_REJECTED', 'Cotizaciones rechazadas por el paciente');

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true } } } },
        quotes: { include: { laboratory: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
        appointments: true,
        results: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ data: mapRequest(full!) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /patient/lab-exams/:id/cancel
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const r = await prisma.labExamRequest.findFirst({
      where: { id: req.params.id, patientId },
    });
    if (!r) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.status)) {
      return res.status(400).json({ error: true, message: 'No se puede cancelar en este estado' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.labExamRequest.update({
        where: { id: r.id },
        data: { status: 'CANCELLED' },
      });
      await tx.labQuote.updateMany({
        where: { requestId: r.id, status: 'SENT' },
        data: { status: 'EXPIRED' },
      });
    });
    await addLabEvent(r.id, 'CANCELLED', req.body?.reason ? `Cancelada: ${req.body.reason}` : 'Solicitud cancelada por el paciente');

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        selectedQuote: { include: { laboratory: { select: { id: true, name: true, phone: true } } } },
        quotes: { include: { laboratory: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
        appointments: true,
        results: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ data: mapRequest(full!) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// GET /patient/lab-exams/:requestId/result-file/:resultId — descarga segura
router.get('/:requestId/result-file/:resultId', async (req: Request, res: Response) => {
  try {
    const patientId = await getPatientProfileId(req);
    if (!patientId) return res.status(400).json({ error: true, message: 'Perfil de paciente no encontrado' });

    const { requestId, resultId } = req.params;

    const result = await prisma.labResult.findFirst({
      where: {
        id: resultId,
        requestId,
        request: { patientId },
        published: true,
      },
    });
    if (!result) return res.status(404).json({ error: true, message: 'Resultado no disponible' });

    const rel = result.fileUrl.replace(/^\/uploads\//, '');
    const abs = path.join(process.cwd(), 'uploads', rel);
    if (!abs.startsWith(path.join(process.cwd(), 'uploads'))) {
      return res.status(400).json({ error: true, message: 'Ruta inválida' });
    }
    if (!fs.existsSync(abs)) return res.status(404).json({ error: true, message: 'Archivo no encontrado' });

    res.download(abs, result.fileName);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
