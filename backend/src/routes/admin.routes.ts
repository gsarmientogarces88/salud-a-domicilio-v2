import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// Helper: obtener o crear config
async function getOrCreateConfig() {
  let cfg = await prisma.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!cfg) {
    cfg = await prisma.commissionSetting.create({ data: {} });
  }
  return cfg;
}

// 1) GET /admin/services — Listar todas las solicitudes
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where = status ? { status: status as any } : {};

    const [list, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          doctor: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        },
      }),
      prisma.serviceRequest.count({ where }),
    ]);
    res.json({ data: list, total, page: parseInt(page as string) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 2) GET /admin/users — Listar usuarios
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const where = role ? { role: role as any } : {};
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isBanned: true, cancellationCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: users });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 3) PATCH /admin/users/:id/ban
router.patch('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: true, message: 'Usuario no encontrado' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBanned: true, banReason: req.body.reason || 'Baneado por administrador' },
    });
    res.json({ message: 'Usuario baneado', data: { id: updated.id, isBanned: updated.isBanned } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 4) PATCH /admin/users/:id/unban
router.patch('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: true, message: 'Usuario no encontrado' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBanned: false, banReason: null, cancellationCount: 0 },
    });
    res.json({ message: 'Usuario desbaneado', data: { id: updated.id, isBanned: updated.isBanned } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 5) PATCH /admin/commission — Actualizar porcentaje
router.patch('/commission', async (req: Request, res: Response) => {
  try {
    const { percentage } = req.body;
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return res.status(400).json({ error: true, message: 'Porcentaje inválido (0-100)' });
    }
    const cfg = await getOrCreateConfig();
    const updated = await prisma.commissionSetting.update({
      where: { id: cfg.id },
      data: { percentage, updatedBy: req.user!.id },
    });
    res.json({ message: 'Comisión actualizada', data: { percentage: updated.percentage } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 6) PATCH /admin/commission/timeout — Actualizar timeout
router.patch('/commission/timeout', async (req: Request, res: Response) => {
  try {
    const { pendingTimeoutSec } = req.body;
    if (typeof pendingTimeoutSec !== 'number' || pendingTimeoutSec < 30) {
      return res.status(400).json({ error: true, message: 'Timeout mínimo 30 segundos' });
    }
    const cfg = await getOrCreateConfig();
    const updated = await prisma.commissionSetting.update({
      where: { id: cfg.id },
      data: { pendingTimeoutSec, updatedBy: req.user!.id },
    });
    res.json({ message: 'Timeout actualizado', data: { pendingTimeoutSec: updated.pendingTimeoutSec } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 7) PATCH /admin/commission/max-cancellations
router.patch('/commission/max-cancellations', async (req: Request, res: Response) => {
  try {
    const { maxCancellations } = req.body;
    if (typeof maxCancellations !== 'number' || maxCancellations < 1) {
      return res.status(400).json({ error: true, message: 'Mínimo 1 cancelación permitida' });
    }
    const cfg = await getOrCreateConfig();
    const updated = await prisma.commissionSetting.update({
      where: { id: cfg.id },
      data: { maxCancellations, updatedBy: req.user!.id },
    });
    res.json({ message: 'Máx cancelaciones actualizado', data: { maxCancellations: updated.maxCancellations } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// --- Laboratorios y exámenes a domicilio (ADMIN ve todo) ---

router.get('/lab-exams', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const where = status ? { status: status as any } : {};

    const [list, total] = await Promise.all([
      prisma.labExamRequest.findMany({
        where,
        skip,
        take: parseInt(limit as string, 10),
        orderBy: { createdAt: 'desc' },
        include: {
          laboratory: { select: { id: true, name: true } },
          patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
          quote: true,
        },
      }),
      prisma.labExamRequest.count({ where }),
    ]);
    res.json({ data: list, total, page: parseInt(page as string, 10) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

router.get('/laboratories', async (_req: Request, res: Response) => {
  try {
    const labs = await prisma.laboratory.findMany({
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    res.json({ data: labs });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
