import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import * as svc from '../services/serviceRequests.service';
import { config } from '../config';
import { distanceKm, getEffectiveDoctorLocation, isUrgentRequestEligibleByDistance } from '../services/geo.service';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// 1) POST /services — Paciente crea solicitud
router.post('/', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });

    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.create] payload:', req.body);
    }
    const sr = await svc.createRequest({ patientId: patient.id, ...req.body });
    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.create] created:', { id: sr.id, status: sr.status, type: sr.type, expiresAt: sr.expiresAt });
    }
    res.status(201).json({ message: 'Solicitud creada', data: sr });
  } catch (e: any) {
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
router.get('/me', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil no encontrado' });

    const list = await prisma.serviceRequest.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    res.json({ data: list });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 3) GET /services/available — Médico: solicitudes Pending
router.get('/available', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const list = await prisma.serviceRequest.findMany({
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
    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.available] list count:', list.length, { doctorId: doctor.id });
    }

    if (!config.geo.urgentProximityFilterEnabled) {
      return res.json({ data: list });
    }

    const effective = await getEffectiveDoctorLocation(doctor.id);

    const now = new Date();
    const urgentTtlMs = Math.max(1, config.serviceRequests.urgentPendingTtlMinutes) * 60 * 1000;
    const scheduledTtlMs = Math.max(1, config.serviceRequests.scheduledPendingTtlMinutes) * 60 * 1000;

    const output: any[] = [];
    for (const sr of list) {
      const excluded: string[] = [];

      // Expiración por tiempo (robusto incluso si hay data vieja sin expiresAt correcto)
      const ttlMs = sr.type === 'URGENT' ? urgentTtlMs : scheduledTtlMs;
      const cutoff = new Date(now.getTime() - ttlMs);
      const isExpiredByCreatedAt = sr.createdAt <= cutoff;
      const isExpiredByExpiresAt = sr.expiresAt != null && sr.expiresAt <= now;
      if (isExpiredByCreatedAt || isExpiredByExpiresAt) excluded.push('EXPIRATION');

      // Distancia solo para urgentes
      let computedDistanceKm: number | null = null;
      if (sr.type === 'URGENT') {
        if (sr.requestLat == null || sr.requestLng == null) {
          excluded.push('DISTANCE_LOCATION_MISSING');
        } else if (effective.kind === 'UNKNOWN') {
          excluded.push('DISTANCE_DOCTOR_LOCATION_MISSING');
        } else {
          computedDistanceKm = distanceKm(
            { lat: effective.lat, lng: effective.lng },
            { lat: sr.requestLat, lng: sr.requestLng }
          );
          if (computedDistanceKm > config.geo.urgentRadiusKm) excluded.push('DISTANCE');
        }
      }

      if (config.isDev) {
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

      if (excluded.length > 0) continue;

      const expiresAtMs =
        sr.expiresAt?.getTime() ?? sr.createdAt.getTime() + (ttlMs > 0 ? ttlMs : urgentTtlMs);
      const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now.getTime()) / 1000));

      output.push({
        ...sr,
        distanceKm: computedDistanceKm == null ? null : Math.round(computedDistanceKm * 10) / 10,
        remainingSeconds,
      });
    }

    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.available] filtered count:', output.length, {
        geoFilter: true,
        urgentTtlMin: config.serviceRequests.urgentPendingTtlMinutes,
        scheduledTtlMin: config.serviceRequests.scheduledPendingTtlMinutes,
      });
    }

    res.json({ data: output });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 4) GET /services/doctor/me — Médico: mis atenciones
router.get('/doctor/me', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const { status } = req.query;
    const where: any = { doctorId: doctor.id };
    if (status) where.status = status as any;

    const list = await prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        transactions: true,
      },
    });

    res.json({ data: list });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 5) GET /services/:id — Detalle (dueño, médico asignado o admin)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        transactions: true,
      },
    });
    if (!sr) return res.status(404).json({ error: true, message: 'No encontrada' });

    // Verificar acceso
    const userId = req.user!.id;
    const role = req.user!.role;
    if (role === 'ADMIN') return res.json({ data: sr });

    const patient = await prisma.patientProfile.findUnique({ where: { userId } });
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
    const isOwner = patient?.id === sr.patientId || doctor?.id === sr.doctorId;
    if (!isOwner) return res.status(403).json({ error: true, message: 'Sin acceso' });

    res.json({ data: sr });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 5c) Chat: GET /services/:id/chat — mensajes del chat (solo paciente dueño o médico asignado)
router.get('/:id/chat', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, patientId: true, doctorId: true },
    });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });

    // Permisos: paciente dueño o doctor asignado
    const userId = req.user!.id;
    const role = req.user!.role;
    const patient = role === 'PATIENT' ? await prisma.patientProfile.findUnique({ where: { userId } }) : null;
    const doctor = role === 'DOCTOR' ? await prisma.doctorProfile.findUnique({ where: { userId } }) : null;
    const allowed = patient?.id === sr.patientId || (doctor?.id && sr.doctorId === doctor.id);
    if (!allowed) return res.status(403).json({ error: true, message: 'Sin acceso al chat' });

    // Chat solo visible cuando ya hay aceptación o atención en curso; en COMPLETED lo dejamos solo lectura
    if (!['ACCEPTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETED'].includes(sr.status)) {
      return res.status(400).json({ error: true, message: 'Chat no disponible en este estado' });
    }

    const messages = await prisma.serviceChatMessage.findMany({
      where: { serviceRequestId: sr.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    res.json({ data: { messages, canWrite: ['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(sr.status) } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

const sendChatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

// 5d) Chat: POST /services/:id/chat — enviar mensaje (solo paciente dueño o médico asignado)
router.post('/:id/chat', async (req: Request, res: Response) => {
  try {
    const parsed = sendChatSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.message });

    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, patientId: true, doctorId: true },
    });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });

    if (!['ACCEPTED', 'QUEUED', 'IN_PROGRESS'].includes(sr.status)) {
      return res.status(400).json({ error: true, message: 'Chat no disponible para enviar mensajes en este estado' });
    }

    const userId = req.user!.id;
    const role = req.user!.role;
    const patient = role === 'PATIENT' ? await prisma.patientProfile.findUnique({ where: { userId } }) : null;
    const doctor = role === 'DOCTOR' ? await prisma.doctorProfile.findUnique({ where: { userId } }) : null;
    const isPatient = patient?.id === sr.patientId;
    const isDoctor = doctor?.id != null && sr.doctorId === doctor.id;
    if (!isPatient && !isDoctor) return res.status(403).json({ error: true, message: 'Sin acceso al chat' });

    const created = await prisma.serviceChatMessage.create({
      data: {
        serviceRequestId: sr.id,
        senderType: isDoctor ? 'DOCTOR' : 'PATIENT',
        senderUserId: userId,
        message: parsed.data.message,
      },
    });

    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.chat.send]', { requestId: sr.id, senderType: created.senderType, senderUserId: userId, createdAt: created.createdAt });
    }

    res.status(201).json({ data: created });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 5b) PATCH /services/:id/location — Paciente confirma pin/ubicación (snapshot)
const confirmLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capturedAt: z.string().datetime().optional(),
  accuracyMeters: z.number().int().positive().max(100000).optional(),
  source: z
    .enum(['PATIENT_MAP_PIN', 'PATIENT_GPS', 'ADDRESS_GEOCODE', 'ADMIN_MANUAL', 'UNKNOWN'])
    .optional()
    .default('PATIENT_MAP_PIN'),
  precision: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional().default('UNKNOWN'),
  confidence: z.number().min(0).max(1).optional(),
});

router.patch('/:id/location', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });

    const sr = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (sr.patientId !== patient.id) return res.status(403).json({ error: true, message: 'Sin acceso' });

    const parsed = confirmLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.message });

    const capturedAt = parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date();

    const updated = await prisma.serviceRequest.update({
      where: { id: sr.id },
      data: {
        requestLat: parsed.data.lat,
        requestLng: parsed.data.lng,
        requestLocationCapturedAt: capturedAt,
        requestLocationAccuracyMeters: parsed.data.accuracyMeters,
        requestLocationSource: parsed.data.source as any,
        requestLocationPrecision: parsed.data.precision as any,
        requestLocationConfidence: parsed.data.confidence,
      },
    });

    res.json({ message: 'Ubicación confirmada', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 6) POST /services/:id/accept — Médico acepta
router.post('/:id/accept', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const sr = await svc.acceptRequest(req.params.id, doctor.id);
    res.json({ message: 'Solicitud aceptada', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

// 6b) POST /services/:id/reject — Médico rechaza (no cambia estado global)
router.post('/:id/reject', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const sr = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
    if (sr.status !== 'PENDING') {
      return res.status(400).json({ error: true, message: 'Solo se pueden rechazar solicitudes en estado PENDING' });
    }
    if (sr.expiresAt && sr.expiresAt < new Date()) {
      return res.status(400).json({ error: true, message: 'Solicitud expirada' });
    }
    if (sr.doctorId && sr.doctorId !== doctor.id) {
      return res.status(400).json({ error: true, message: 'La solicitud ya fue tomada por otro médico' });
    }

    if (config.isDev) {
      // eslint-disable-next-line no-console
      console.log('[services.reject] attempt:', { serviceId: sr.id, doctorId: doctor.id, status: sr.status, createdAt: sr.createdAt, expiresAt: sr.expiresAt });
    }

    const parsed = rejectSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.message });

    await prisma.serviceRequestRejection.upsert({
      where: { serviceRequestId_doctorId: { serviceRequestId: sr.id, doctorId: doctor.id } },
      create: { serviceRequestId: sr.id, doctorId: doctor.id, reason: parsed.data.reason },
      update: { reason: parsed.data.reason },
    });

    res.json({ message: 'Solicitud rechazada' });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 7) PATCH /services/:id/status — Médico cambia estado (InProgress, Completed)
router.patch('/:id/status', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const { status, notes } = req.body;

    let sr;
    if (status === 'IN_PROGRESS') {
      sr = await svc.startRequest(req.params.id, doctor.id);
    } else if (status === 'COMPLETED') {
      sr = await svc.completeRequest(req.params.id, doctor.id, notes);
    } else {
      return res.status(400).json({ error: true, message: 'Status no permitido desde esta ruta' });
    }

    res.json({ message: `Estado actualizado a ${status}`, data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 8) DELETE /services/:id — Cancelar (solo PENDING)
router.delete('/:id', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const sr = await svc.cancelRequest(req.params.id, req.user!.id, req.body.reason);
    res.json({ message: 'Solicitud cancelada', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 8b) POST /services/:id/cancel-by-doctor — Profesional cancela con motivo
router.post('/:id/cancel-by-doctor', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const { reason } = req.body as { reason?: string };
    const sr = await svc.cancelByDoctor(req.params.id, doctor.id, reason);
    res.json({ message: 'Cita cancelada por el profesional', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 9) GET /services — Admin: listar todas
router.get('/', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where = status ? { status: status as any } : {};

    const [list, total] = await Promise.all([
      prisma.serviceRequest.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.serviceRequest.count({ where }),
    ]);
    res.json({ data: list, total, page: parseInt(page as string) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
