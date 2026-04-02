import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import { orderUpload } from '../lib/upload';
import { addLabEvent, formatLabDisplayId, getPatientUserId } from '../services/labExamHelpers';
import { notifyUser } from '../services/labNotifications.service';

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
        laboratory: { select: { id: true, name: true, phone: true } },
        quote: true,
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
        laboratory: { select: { id: true, name: true, phone: true, commune: true } },
        quote: true,
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
        laboratoryId,
        patientName,
        examRequested,
        address,
        commune,
        phone,
        observationsPatient,
        preferredTime,
      } = req.body;

      if (!laboratoryId || !patientName || !examRequested || !address || !commune || !phone) {
        return res.status(400).json({
          error: true,
          message: 'Campos requeridos: laboratoryId, patientName, examRequested, address, commune, phone',
        });
      }

      const lab = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
      if (!lab) return res.status(400).json({ error: true, message: 'Laboratorio no válido' });

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const resolvedName =
        typeof patientName === 'string' && patientName.trim()
          ? patientName.trim()
          : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

      const relative = `orders/${file.filename}`;
      const orderFileUrl = `/uploads/lab/${relative}`;

      const created = await prisma.labExamRequest.create({
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

      await addLabEvent(created.id, 'REQUEST_CREATED', 'Solicitud enviada');
      await addLabEvent(created.id, 'ORDER_RECEIVED', 'Orden médica recibida');

      const full = await prisma.labExamRequest.findUnique({
        where: { id: created.id },
        include: {
          laboratory: { select: { id: true, name: true, phone: true } },
          quote: true,
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

    const r = await prisma.labExamRequest.findFirst({
      where: { id: req.params.id, patientId },
      include: { quote: true },
    });
    if (!r) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (r.status !== 'QUOTED' || !r.quote) {
      return res.status(400).json({ error: true, message: 'No hay cotización activa para aceptar' });
    }

    await prisma.labExamRequest.update({
      where: { id: r.id },
      data: { status: 'PATIENT_ACCEPTED' },
    });
    await addLabEvent(r.id, 'QUOTE_ACCEPTED', 'Cotización aceptada por el paciente');

    const uid = await getPatientUserId(patientId);
    if (uid) {
      await notifyUser(
        uid,
        'LAB_QUOTE',
        'Cotización aceptada',
        `Aceptaste la cotización ${formatLabDisplayId(r.displayNumber)}. El laboratorio coordinará la visita.`,
        `/dashboard/patient/examenes-domicilio`
      );
    }

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        laboratory: { select: { id: true, name: true, phone: true } },
        quote: true,
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
    if (r.status !== 'QUOTED') {
      return res.status(400).json({ error: true, message: 'Solo puedes rechazar cuando hay cotización' });
    }

    await prisma.labExamRequest.update({
      where: { id: r.id },
      data: { status: 'CANCELLED' },
    });
    await addLabEvent(r.id, 'QUOTE_REJECTED', 'Cotización rechazada por el paciente');

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        laboratory: { select: { id: true, name: true, phone: true } },
        quote: true,
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
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status)) {
      return res.status(400).json({ error: true, message: 'No se puede cancelar en este estado' });
    }

    await prisma.labExamRequest.update({
      where: { id: r.id },
      data: { status: 'CANCELLED' },
    });
    await addLabEvent(r.id, 'CANCELLED', req.body?.reason ? `Cancelada: ${req.body.reason}` : 'Solicitud cancelada por el paciente');

    const full = await prisma.labExamRequest.findUnique({
      where: { id: r.id },
      include: {
        laboratory: { select: { id: true, name: true, phone: true } },
        quote: true,
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
