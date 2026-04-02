import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getAvailableSlotsForDate } from '../services/scheduling.service';

const router = Router();

router.use(authenticate);

// GET /professionals?type=...&region=...&city=...&commune=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, region, city, commune } = req.query as {
      type?: string;
      region?: string;
      city?: string;
      commune?: string;
    };

    const where: any = {
      isVerified: true,
      isAvailable: true,
    };

    if (region) {
      // Regla: no mostrar profesionales fuera de la región del paciente
      where.region = region;
    }

    if (type && type.trim()) {
      where.specialty = {
        contains: type.trim(),
        mode: 'insensitive',
      };
    }

    const list = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const regionLc = (region || '').toLowerCase();
    const cityLc = (city || '').toLowerCase();
    const communeLc = (commune || '').toLowerCase();

    const ranked = list
      .map((p) => {
        let rank = 3;
        const pRegion = (p.region || '').toLowerCase();
        const pCity = (p.city || '').toLowerCase();
        const pCommune = (p.commune || '').toLowerCase();

        if (regionLc && pRegion !== regionLc) {
          // por seguridad, empujamos fuera de la lista aunque el filtro ya se aplicó
          rank = 99;
        } else if (communeLc && pCommune === communeLc) {
          rank = 0;
        } else if (cityLc && pCity === cityLc) {
          rank = 1;
        } else if (regionLc && pRegion === regionLc) {
          rank = 2;
        }

        return { profile: p, rank };
      })
      .filter((x) => x.rank < 99)
      .sort((a, b) => a.rank - b.rank);

    res.json({
      data: ranked.map((x) => x.profile),
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// GET /professionals/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: true, message: 'Parámetro date requerido (YYYY-MM-DD)' });
    }

    const target = new Date(date);
    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({ error: true, message: 'Fecha inválida' });
    }

    const slots = await getAvailableSlotsForDate(id, target);
    res.json({ data: { slots } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;

