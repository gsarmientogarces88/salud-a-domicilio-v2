import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import {
  getScheduleForProfessional,
  setScheduleForProfessional,
  getAvailableSlotsForDate,
  isSlotAvailable,
} from '../services/scheduling.service';
import * as svc from '../services/serviceRequests.service';
import { assertBookingSlotAllowed } from '../lib/appointmentBookingRules';
import { coalesceProvinceFromPayload } from '../lib/territoryCompat';

const router = Router();

// Todas las rutas requieren usuario autenticado
router.use(authenticate);

// Obtener configuración de agenda del profesional autenticado
router.get('/me', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
    }

    const data = await getScheduleForProfessional(profile.id);
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Guardar configuración de agenda del profesional autenticado
router.put('/me', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil profesional no encontrado' });
    }

    const { availability = [], blockedSlots = [] } = req.body as {
      availability?: any[];
      blockedSlots?: any[];
    };

    const data = await setScheduleForProfessional(profile.id, availability || [], blockedSlots || []);
    res.json({ message: 'Agenda actualizada', data });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// Obtener slots disponibles para un profesional en una fecha concreta
router.get('/slots/:professionalId', async (req: Request, res: Response) => {
  try {
    const { professionalId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: true, message: 'Parámetro date requerido (YYYY-MM-DD)' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: true, message: 'date debe ser YYYY-MM-DD' });
    }

    const slots = await getAvailableSlotsForDate(professionalId, date);
    res.json({ data: { slots } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Crear reserva (Appointment) verificando disponibilidad
router.post('/book', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) {
      return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });
    }

    const body = req.body as {
      professionalId?: string;
      description?: string;
      address?: string;
      commune?: string;
      province?: string;
      city?: string;
      scheduledAt?: string;
    };
    const { professionalId, description, address, commune, scheduledAt } = body;
    const province = coalesceProvinceFromPayload(body);

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
      assertBookingSlotAllowed(start, new Date());
    } catch (err: any) {
      return res.status(400).json({ error: true, message: err.message || 'Fecha u hora no permitida' });
    }

    const available = await isSlotAvailable(professionalId, start);
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
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

export default router;

