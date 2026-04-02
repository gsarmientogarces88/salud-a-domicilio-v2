import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import * as agenda from '../services/agenda.service';
import { haversineDistance } from '../lib/haversine';

const router = Router();
router.use(authenticate);

// POST /agenda/requests — Paciente crea solicitud de agenda
router.post('/requests', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });

    const {
      professionalId,
      slotId,
      addressText,
      region,
      city,
      commune,
      lat,
      lng,
      notes,
    } = req.body as {
      professionalId?: string;
      slotId?: string;
      addressText?: string;
      region?: string;
      city?: string;
      commune?: string;
      lat?: number;
      lng?: number;
      notes?: string;
    };

    if (!professionalId || !slotId || !addressText || !region || !city || !commune) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos: professionalId, slotId, addressText, region, city, commune',
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
      city,
      commune,
      lat: latNum,
      lng: lngNum,
      notes,
    });

    res.status(201).json({
      message: 'Solicitud enviada. Esperando confirmación del profesional (máx. 20 min).',
      data: { id: request.id, status: request.status },
    });
  } catch (e: any) {
    const msg = e.message || 'Error al crear solicitud';
    console.log('[AGENDA] POST /requests error:', msg);
    res.status(400).json({ error: true, message: msg });
  }
});

// GET /agenda/requests — Profesional lista sus solicitudes; Paciente lista las suyas
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });

    if (doctor) {
      const where: any = { professionalId: doctor.id };
      if (status && typeof status === 'string') where.status = status;
      const list = await prisma.appointmentRequest.findMany({
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
      const safe = list.map((r) => {
        const { addressText: _at, ...rest } = r as any;
        const prof = r.professional as { baseLat?: number | null; baseLng?: number | null } | null;
        const dist = prof?.baseLat != null && prof?.baseLng != null
          ? haversineDistance(prof.baseLat, prof.baseLng, r.lat, r.lng).toFixed(1)
          : null;
        return { ...rest, addressDisplay: r.commune, distanceKm: dist };
      });
      return res.json({ data: safe });
    }

    if (patient) {
      const where: any = { patientId: patient.id };
      if (status && typeof status === 'string') where.status = status;
      const list = await prisma.appointmentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          slot: true,
          payment: true,
          professional: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
      return res.json({ data: list });
    }

    return res.status(403).json({ error: true, message: 'Sin perfil' });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// GET /agenda/requests/:id — Detalle (paciente dueño o profesional asignado)
router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const r = await prisma.appointmentRequest.findUnique({
      where: { id: req.params.id },
      include: {
        slot: true,
        payment: true,
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        professional: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!r) return res.status(404).json({ error: true, message: 'No encontrada' });

    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    const isDoctor = doctor?.id === r.professionalId;
    const isPatient = patient?.id === r.patientId;
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ error: true, message: 'Sin acceso' });
    }

    // Profesional: no enviar addressText hasta que acepte (MVP: enviamos comuna)
    const out = isDoctor && r.status !== 'CONFIRMED'
      ? { ...r, addressText: undefined, addressDisplay: `${r.commune}` }
      : r;

    res.json({ data: out });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /agenda/requests/:id/accept
router.post('/requests/:id/accept', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
    await agenda.acceptAppointmentRequest(req.params.id, doctor.id);
    res.json({ message: 'Solicitud aceptada', data: { status: 'CONFIRMED' } });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// POST /agenda/requests/:id/reject
router.post('/requests/:id/reject', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
    const { reason, comment } = req.body as { reason?: string; comment?: string };
    const validReasons = ['DISTANCIA', 'ZONA', 'HORARIO', 'OTRO'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: true, message: 'reason obligatorio: DISTANCIA, ZONA, HORARIO u OTRO' });
    }
    await agenda.rejectAppointmentRequest(req.params.id, doctor.id, reason, comment);
    res.json({ message: 'Solicitud rechazada' });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// GET /agenda/slots — Slots disponibles de un profesional para una fecha
router.get('/slots', async (req: Request, res: Response) => {
  try {
    const { professionalId, date } = req.query;
    if (!professionalId || !date || typeof professionalId !== 'string' || typeof date !== 'string') {
      return res.status(400).json({ error: true, message: 'professionalId y date requeridos' });
    }
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({ error: true, message: 'Fecha inválida' });
    }
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        professionalId,
        startAt: { gte: startOfDay, lte: endOfDay },
        status: 'AVAILABLE',
        OR: [{ heldUntil: null }, { heldUntil: { gt: new Date() } }],
      },
      orderBy: { startAt: 'asc' },
    });

    res.json({
      data: slots.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
