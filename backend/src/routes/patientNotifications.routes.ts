import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';

const router = Router();

router.use(authenticate, authorize('PATIENT'));

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: list });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const n = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    });
    if (n.count === 0) return res.status(404).json({ error: true, message: 'Notificación no encontrada' });
    res.json({ message: 'Ok' });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
