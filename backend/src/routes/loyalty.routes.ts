import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import {
  acknowledgeLoyaltyMilestone,
  getDoctorLoyaltyHistory,
  getDoctorLoyaltySummary,
  listDoctorsLoyalty,
} from '../services/loyalty.service';

export const doctorLoyaltyRouter = Router();
doctorLoyaltyRouter.use(authenticate, authorize('DOCTOR'));

async function doctorProfileId(userId: string) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

doctorLoyaltyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const id = await doctorProfileId(req.user!.id);
    if (!id) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    const data = await getDoctorLoyaltySummary(id);
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

doctorLoyaltyRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const id = await doctorProfileId(req.user!.id);
    if (!id) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '30'), 10);
    const data = await getDoctorLoyaltyHistory(id, { page, limit });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

doctorLoyaltyRouter.post('/milestones/:id/ack', async (req: Request, res: Response) => {
  try {
    const id = await doctorProfileId(req.user!.id);
    if (!id) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });
    const ok = await acknowledgeLoyaltyMilestone(id, req.params.id);
    if (!ok) return res.status(404).json({ error: true, message: 'Meta no encontrada' });
    res.json({ message: 'Ok' });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export const adminLoyaltyRouter = Router();
adminLoyaltyRouter.use(authenticate, authorize('ADMIN'));

adminLoyaltyRouter.get('/doctors', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const result = await listDoctorsLoyalty({ q, page, limit });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});
