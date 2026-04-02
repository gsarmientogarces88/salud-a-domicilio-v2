"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const scheduling_service_1 = require("../services/scheduling.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /professionals?type=...&region=...&city=...&commune=...
router.get('/', async (req, res) => {
    try {
        const { type, region, city, commune } = req.query;
        const where = {
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
        const list = await prisma_1.default.doctorProfile.findMany({
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
            }
            else if (communeLc && pCommune === communeLc) {
                rank = 0;
            }
            else if (cityLc && pCity === cityLc) {
                rank = 1;
            }
            else if (regionLc && pRegion === regionLc) {
                rank = 2;
            }
            return { profile: p, rank };
        })
            .filter((x) => x.rank < 99)
            .sort((a, b) => a.rank - b.rank);
        res.json({
            data: ranked.map((x) => x.profile),
        });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// GET /professionals/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', async (req, res) => {
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
        const slots = await (0, scheduling_service_1.getAvailableSlotsForDate)(id, target);
        res.json({ data: { slots } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
