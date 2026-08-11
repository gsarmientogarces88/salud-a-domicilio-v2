import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();
router.use(authenticate, authorize('PATIENT'));

const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
});

type UserForProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

function mapProfileResponse(user: UserForProfile) {
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    },
  };
}

// GET /patient/profile — solo columnas existentes en `users` (no consulta `patient_profiles`).
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
    if (!user) return res.status(404).json({ error: true, message: 'Usuario no encontrado' });

    res.json({ data: mapProfileResponse(user) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// PATCH /patient/profile — solo actualiza `users`.
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: parsed.error.message });
    }
    const body = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true },
    });
    if (!user) return res.status(404).json({ error: true, message: 'Usuario no encontrado' });

    if (body.email && body.email.toLowerCase() !== user.email.toLowerCase()) {
      const taken = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (taken) return res.status(409).json({ error: true, message: 'El correo ya está en uso' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.email ? { email: body.email.toLowerCase() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      },
    });

    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    res.json({ data: mapProfileResponse(freshUser!) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
