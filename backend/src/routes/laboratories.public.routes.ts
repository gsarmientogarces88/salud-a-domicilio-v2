import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /laboratories — listado público para que el paciente elija laboratorio
router.get('/', async (_req: Request, res: Response) => {
  try {
    const labs = await prisma.laboratory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        commune: true,
        city: true,
        region: true,
        phone: true,
      },
    });
    res.json({ data: labs });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
