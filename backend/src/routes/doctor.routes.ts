import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { config } from '../config';
import { getEffectiveDoctorLocation } from '../services/geo.service';

const router = Router();

router.use(authenticate, authorize('DOCTOR'));

// GET /doctor/me — perfil del médico
router.get('/me', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    res.json({ data: profile });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// GET /doctor/me/location/effective — ubicación efectiva (live > base)
router.get('/me/location/effective', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true, baseLat: true, baseLng: true },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    const effective = await getEffectiveDoctorLocation(profile.id);
    res.json({ data: { effective, base: { lat: profile.baseLat, lng: profile.baseLng } } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// PATCH /doctor/me/availability — cambiar disponibilidad
router.patch('/me/availability', async (req: Request, res: Response) => {
  try {
    const { isAvailable } = req.body as { isAvailable?: boolean };

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: true, message: 'Campo isAvailable requerido' });
    }

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: { isAvailable },
    });

    res.json({ message: 'Disponibilidad actualizada', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// PATCH /doctor/me/settings — configuración básica (especialidad, tarifa)
router.patch('/me/settings', async (req: Request, res: Response) => {
  try {
    const { specialty, baseFee } = req.body as { specialty?: string; baseFee?: number };

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    const data: any = {};
    if (typeof specialty === 'string' && specialty.trim()) data.specialty = specialty.trim();
    if (typeof baseFee === 'number' && baseFee > 0) data.baseFee = Math.round(baseFee);

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data,
    });

    res.json({ message: 'Configuración actualizada', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

const baseLocationSchema = z.object({
  baseLat: z.number().min(-90).max(90),
  baseLng: z.number().min(-180).max(180),
});

// PATCH /doctor/me/location/base — set base fallback location
router.patch('/me/location/base', async (req: Request, res: Response) => {
  try {
    const parsed = baseLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.message });

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: { baseLat: parsed.data.baseLat, baseLng: parsed.data.baseLng },
    });

    res.json({ message: 'Ubicación base actualizada', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

const liveLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capturedAt: z.string().datetime().optional(),
  accuracyMeters: z.number().int().positive().max(100000).optional(),
  source: z.enum(['APP_GPS', 'WEB_BROWSER']).default('WEB_BROWSER'),
  permissionState: z.enum(['granted', 'denied', 'prompt', 'unknown']).optional(),
  sessionId: z.string().max(200).optional(),
  deviceId: z.string().max(200).optional(),
});

// PUT /doctor/me/location/live — upsert live location (web/app)
router.put('/me/location/live', async (req: Request, res: Response) => {
  try {
    const parsed = liveLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.message });

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }

    const capturedAt = parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date();
    const ttlSeconds = parsed.data.source === 'APP_GPS' ? config.geo.ttlSecondsApp : config.geo.ttlSecondsWeb;
    const expiresAt = new Date(capturedAt.getTime() + ttlSeconds * 1000);

    const upserted = await prisma.doctorLiveLocation.upsert({
      where: { doctorId: profile.id },
      create: {
        doctorId: profile.id,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        accuracyMeters: parsed.data.accuracyMeters,
        capturedAt,
        ttlSeconds,
        expiresAt,
        source: parsed.data.source as any,
        permissionState: parsed.data.permissionState,
        sessionId: parsed.data.sessionId,
        deviceId: parsed.data.deviceId,
      },
      update: {
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        accuracyMeters: parsed.data.accuracyMeters,
        capturedAt,
        ttlSeconds,
        expiresAt,
        source: parsed.data.source as any,
        permissionState: parsed.data.permissionState,
        sessionId: parsed.data.sessionId,
        deviceId: parsed.data.deviceId,
      },
    });

    res.json({ message: 'Ubicación en vivo actualizada', data: upserted });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;

