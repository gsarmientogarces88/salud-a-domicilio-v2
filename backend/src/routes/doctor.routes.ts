import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { config } from '../config';
import { getEffectiveDoctorLocation } from '../services/geo.service';
import {
  REQUIRED_DOC_TYPES,
  deletePrivateDocIfExists,
  doctorDocUpload,
  isDoctorDocumentType,
} from '../lib/privateDoctorDocs';
import type { DoctorDocumentType } from '@prisma/client';
import { AGENDA_HOME_VISIT_FEE_ERROR, isValidAgendaBaseFee } from '../lib/agendaPricing';

const router = Router();

router.use(authenticate, authorize('DOCTOR'));

async function resolveDoctorProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    }
    (req as Request & { doctorProfileId?: string }).doctorProfileId = profile.id;
    next();
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
}

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

    const parsedFee =
      typeof baseFee === 'number' ? baseFee : baseFee != null ? Number(baseFee) : NaN;
    if (!isValidAgendaBaseFee(parsedFee)) {
      return res.status(400).json({ error: true, message: AGENDA_HOME_VISIT_FEE_ERROR });
    }

    const data: { specialty?: string; baseFee: number } = {
      baseFee: Math.round(parsedFee),
    };
    if (typeof specialty === 'string' && specialty.trim()) data.specialty = specialty.trim();

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

// ========== Verificación de identidad / documentos ==========

router.get('/me/verification', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        verificationDocs: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            type: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!profile) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    res.json({
      data: {
        verificationStatus: profile.verificationStatus,
        verificationNote: profile.verificationNote,
        documentsSubmittedAt: profile.documentsSubmittedAt,
        isVerified: profile.isVerified,
        specialty: profile.specialty,
        bankName: profile.bankName,
        bankAccountType: profile.bankAccountType,
        bankAccountNumber: profile.bankAccountNumber,
        documents: profile.verificationDocs,
        requiredTypes: REQUIRED_DOC_TYPES,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

router.post(
  '/me/verification/documents',
  resolveDoctorProfile,
  (req: Request, res: Response, next: NextFunction) => {
    doctorDocUpload.single('file')(req, res, (err: unknown) => {
      if (err) return res.status(400).json({ error: true, message: (err as Error).message });
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const doctorId = (req as Request & { doctorProfileId?: string }).doctorProfileId!;
      const typeRaw = String((req.body as { type?: string })?.type || '');
      if (!isDoctorDocumentType(typeRaw)) {
        return res.status(400).json({ error: true, message: 'Tipo de documento inválido' });
      }
      const type = typeRaw as DoctorDocumentType;
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) return res.status(400).json({ error: true, message: 'Archivo requerido' });

      const storageKey = `${doctorId}/${file.filename}`;
      const existing = await prisma.doctorVerificationDocument.findUnique({
        where: { doctorId_type: { doctorId, type } },
      });
      if (existing) deletePrivateDocIfExists(existing.storageKey);

      const doc = await prisma.doctorVerificationDocument.upsert({
        where: { doctorId_type: { doctorId, type } },
        create: {
          doctorId,
          type,
          storageKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
        update: {
          storageKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });

      // Si estaba rechazado/aprobado, vuelve a incompleto al subir corrección
      const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
      if (profile && (profile.verificationStatus === 'REJECTED' || profile.verificationStatus === 'APPROVED')) {
        await prisma.doctorProfile.update({
          where: { id: doctorId },
          data: {
            verificationStatus: 'INCOMPLETE',
            isVerified: false,
            verificationNote: profile.verificationStatus === 'REJECTED' ? profile.verificationNote : null,
          },
        });
      }

      res.status(201).json({
        message: 'Documento subido',
        data: {
          id: doc.id,
          type: doc.type,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          updatedAt: doc.updatedAt,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: true, message: e.message });
    }
  },
);

router.patch('/me/verification/bank', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const { bankName, bankAccountType, bankAccountNumber } = req.body as {
      bankName?: string;
      bankAccountType?: string;
      bankAccountNumber?: string;
    };
    if (!bankName?.trim() || !bankAccountType?.trim() || !bankAccountNumber?.trim()) {
      return res.status(400).json({ error: true, message: 'Completa los datos bancarios' });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: {
        bankName: bankName.trim(),
        bankAccountType: bankAccountType.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
      },
    });
    res.json({ message: 'Datos bancarios guardados', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

router.post('/me/verification/submit', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user!.id },
      include: { verificationDocs: { select: { type: true } } },
    });
    if (!profile) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const uploaded = new Set(profile.verificationDocs.map((d) => d.type));
    const missing = REQUIRED_DOC_TYPES.filter((t) => !uploaded.has(t));
    if (missing.length > 0) {
      return res.status(400).json({
        error: true,
        message: `Faltan documentos: ${missing.join(', ')}`,
      });
    }
    if (!profile.bankName || !profile.bankAccountType || !profile.bankAccountNumber) {
      return res.status(400).json({ error: true, message: 'Completa y guarda los datos bancarios antes de enviar' });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: 'SUBMITTED',
        documentsSubmittedAt: new Date(),
        verificationNote: null,
      },
    });
    res.json({ message: 'Documentación enviada a revisión', data: updated });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;

