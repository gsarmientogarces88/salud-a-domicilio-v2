import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { coalesceProvinceFromQuery } from '../lib/territoryCompat';
import { getAvailableSlotsForDate } from '../services/scheduling.service';
import { config } from '../config';
import { distanceKm, getEffectiveDoctorLocation } from '../services/geo.service';

const router = Router();

router.use(authenticate);

function parseCoord(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

// GET /professionals?type=...&lat=...&lng=...&forAgenda=1
// Con forAgenda=1 exige lat/lng y solo devuelve prestadores ≤ agendaRadiusKm (default 10 km).
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, region, commune, forAgenda } = req.query as {
      type?: string;
      region?: string;
      commune?: string;
      forAgenda?: string;
    };
    const provinceFilter = coalesceProvinceFromQuery(req.query as Record<string, unknown>);
    const agendaMode = String(forAgenda || '') === '1';
    const patientLat = parseCoord(req.query.lat);
    const patientLng = parseCoord(req.query.lng);

    if (agendaMode) {
      if (patientLat == null || patientLng == null) {
        return res.status(400).json({
          error: true,
          message: 'Para agenda se requieren lat y lng del paciente (filtro de proximidad).',
        });
      }
      if (patientLat < -90 || patientLat > 90 || patientLng < -180 || patientLng > 180) {
        return res.status(400).json({ error: true, message: 'lat/lng inválidos' });
      }
    }

    const where: any = {
      isVerified: true,
    };
    // Agenda programada no exige "disponible ahora" (eso es para urgencia).
    if (!agendaMode) {
      where.isAvailable = true;
    }

    if (region) {
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
    const radiusKm = config.geo.agendaRadiusKm;

    const ranked: Array<{
      profile: (typeof list)[number];
      rank: number;
      distanceKm: number | null;
    }> = [];

    for (const p of list) {
      let rank = 3;
      const pRegion = (p.region || '').toLowerCase();
      const pProvince = (p.province || '').toLowerCase();
      const pCommune = (p.commune || '').toLowerCase();

      if (regionLc && pRegion !== regionLc) {
        continue;
      } else if (communeLc && pCommune === communeLc) {
        rank = 0;
      } else if (provinceLc && pProvince === provinceLc) {
        rank = 1;
      } else if (regionLc && pRegion === regionLc) {
        rank = 2;
      }

      let dist: number | null = null;

      if (agendaMode && patientLat != null && patientLng != null) {
        const eff = await getEffectiveDoctorLocation(p.id);
        if (eff.kind === 'UNKNOWN') {
          // Sin ubicación del médico no puede entrar al radio de 10 km
          continue;
        }
        dist = distanceKm(
          { lat: patientLat, lng: patientLng },
          { lat: eff.lat, lng: eff.lng },
        );
        if (dist > radiusKm) continue;
      }

      ranked.push({ profile: p, rank, distanceKm: dist });
    }

    ranked.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.rank - b.rank;
    });

    res.json({
      data: ranked.map((x) => {
        const p = x.profile;
        return {
          ...p,
          city: p.province,
          baseFee: p.baseFee,
          acceptsWebpay: true,
          acceptsIsapreBono: true,
          ratingAverage: 4.8,
          ratingCount: 24,
          distanceKm:
            x.distanceKm == null ? null : Math.round(x.distanceKm * 10) / 10,
        };
      }),
      meta: agendaMode
        ? { radiusKm, proximityFilter: true }
        : { proximityFilter: false },
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
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[PROFESSIONALS availability]', {
        professionalId: id,
        dateReceived: date,
        slotsCount: slots.length,
        sample: slots.slice(0, 8),
      });
    }
    res.json({ data: { slots } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
