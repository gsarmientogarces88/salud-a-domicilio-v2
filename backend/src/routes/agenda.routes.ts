import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import * as agenda from '../services/agenda.service';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { BOOKING_TIMEZONE, evaluateBookingSlot } from '../lib/appointmentBookingRules';
import * as geo from '../services/geo.service';
import { coalesceProvinceFromPayload } from '../lib/territoryCompat';

const router = Router();
router.use(authenticate);

// POST /agenda/requests — Paciente crea solicitud de agenda
router.post('/requests', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });

    const body = req.body as {
      professionalId?: string;
      slotId?: string;
      addressText?: string;
      region?: string;
      province?: string;
      city?: string;
      commune?: string;
      lat?: number;
      lng?: number;
      notes?: string;
    };
    const {
      professionalId,
      slotId,
      addressText,
      lat,
      lng,
      notes,
    } = body;
    const region = (body.region || '').trim() || 'Chile';
    const province = (coalesceProvinceFromPayload(body) || '').trim() || 'Sin especificar';
    const commune = (body.commune || '').trim() || 'Sin especificar';

    if (!professionalId || !slotId || !addressText) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos: professionalId, slotId, addressText',
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
      const safe = await Promise.all(
        list.map(async (r) => {
          const { addressText: _at, ...rest } = r as any;
          const eff = await geo.getEffectiveDoctorLocation(r.professionalId);
          let distanceKm: string | null = null;
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
        }),
      );
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
      return res.json({
        data: list.map((row) => ({ ...row, city: row.province })),
      });
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

    res.json({ data: { ...out, city: out.province } });
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: true, message: 'date debe ser YYYY-MM-DD' });
    }

    const dayStart = fromZonedTime(`${date}T00:00:00`, BOOKING_TIMEZONE);
    const dayEndExclusive = addDays(dayStart, 1);

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        professionalId,
        startAt: { gte: dayStart, lt: dayEndExclusive },
        status: 'AVAILABLE',
        OR: [{ heldUntil: null }, { heldUntil: { gt: new Date() } }],
      },
      orderBy: { startAt: 'asc' },
    });

    const now = new Date();
    const allowed = slots.filter((s) => evaluateBookingSlot(s.startAt, now).ok);

    res.json({
      data: allowed.map((s) => ({
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
