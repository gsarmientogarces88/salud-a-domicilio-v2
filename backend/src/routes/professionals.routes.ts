import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { coalesceProvinceFromQuery } from '../lib/territoryCompat';
import { getAvailableSlotsForDate } from '../services/scheduling.service';

const router = Router();

router.use(authenticate);

// GET /professionals?type=...&region=...&province=...&commune=... (city= alias legacy)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, region, commune, forAgenda } = req.query as {
      type?: string;
      region?: string;
      commune?: string;
      forAgenda?: string;
    };
    const provinceFilter = coalesceProvinceFromQuery(req.query as Record<string, unknown>);

    const where: any = {
      isVerified: true,
    };
    // Agenda programada no exige "disponible ahora" (eso es para urgencia).
    if (String(forAgenda || '') !== '1') {
      where.isAvailable = true;
    }

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
    const provinceLc = provinceFilter.toLowerCase();
    const communeLc = (commune || '').toLowerCase();

    const ranked = list
      .map((p) => {
        let rank = 3;
        const pRegion = (p.region || '').toLowerCase();
        const pProvince = (p.province || '').toLowerCase();
        const pCommune = (p.commune || '').toLowerCase();

        if (regionLc && pRegion !== regionLc) {
          // por seguridad, empujamos fuera de la lista aunque el filtro ya se aplicó
          rank = 99;
        } else if (communeLc && pCommune === communeLc) {
          rank = 0;
        } else if (provinceLc && pProvince === provinceLc) {
          rank = 1;
        } else if (regionLc && pRegion === regionLc) {
          rank = 2;
        }

        return { profile: p, rank };
      })
      .filter((x) => x.rank < 99)
      .sort((a, b) => a.rank - b.rank);

    res.json({
      data: ranked.map((x) => {
        const p = x.profile;
        return {
          ...p,
          city: p.province,
          acceptsWebpay: true,
          acceptsIsapreBono: true,
          ratingAverage: 4.8,
          ratingCount: 24,
        };
      }),
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: true, message: 'date debe ser YYYY-MM-DD' });
    }

    const slots = await getAvailableSlotsForDate(id, date);
    res.json({ data: { slots } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;

