"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, roles_1.authorize)('ADMIN'));
// Helper: obtener o crear config
async function getOrCreateConfig() {
    let cfg = await prisma_1.default.commissionSetting.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!cfg) {
        cfg = await prisma_1.default.commissionSetting.create({ data: {} });
    }
    return cfg;
}
// 1) GET /admin/services — Listar todas las solicitudes
router.get('/services', async (req, res) => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = status ? { status: status } : {};
        const [list, total] = await Promise.all([
            prisma_1.default.serviceRequest.findMany({
                where, skip, take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
                    doctor: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
                },
            }),
            prisma_1.default.serviceRequest.count({ where }),
        ]);
        res.json({ data: list, total, page: parseInt(page) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 2) GET /admin/users — Listar usuarios
router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        const where = role ? { role: role } : {};
        const users = await prisma_1.default.user.findMany({
            where,
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isBanned: true, cancellationCount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ data: users });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 3) PATCH /admin/users/:id/ban
router.patch('/users/:id/ban', async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: req.params.id } });
        if (!user)
            return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
        const updated = await prisma_1.default.user.update({
            where: { id: req.params.id },
            data: { isBanned: true, banReason: req.body.reason || 'Baneado por administrador' },
        });
        res.json({ message: 'Usuario baneado', data: { id: updated.id, isBanned: updated.isBanned } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 4) PATCH /admin/users/:id/unban
router.patch('/users/:id/unban', async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: req.params.id } });
        if (!user)
            return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
        const updated = await prisma_1.default.user.update({
            where: { id: req.params.id },
            data: { isBanned: false, banReason: null, cancellationCount: 0 },
        });
        res.json({ message: 'Usuario desbaneado', data: { id: updated.id, isBanned: updated.isBanned } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 5) PATCH /admin/commission — Actualizar porcentaje
router.patch('/commission', async (req, res) => {
    try {
        const { percentage } = req.body;
        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
            return res.status(400).json({ error: true, message: 'Porcentaje inválido (0-100)' });
        }
        const cfg = await getOrCreateConfig();
        const updated = await prisma_1.default.commissionSetting.update({
            where: { id: cfg.id },
            data: { percentage, updatedBy: req.user.id },
        });
        res.json({ message: 'Comisión actualizada', data: { percentage: updated.percentage } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 6) PATCH /admin/commission/timeout — Actualizar timeout
router.patch('/commission/timeout', async (req, res) => {
    try {
        const { pendingTimeoutSec } = req.body;
        if (typeof pendingTimeoutSec !== 'number' || pendingTimeoutSec < 30) {
            return res.status(400).json({ error: true, message: 'Timeout mínimo 30 segundos' });
        }
        const cfg = await getOrCreateConfig();
        const updated = await prisma_1.default.commissionSetting.update({
            where: { id: cfg.id },
            data: { pendingTimeoutSec, updatedBy: req.user.id },
        });
        res.json({ message: 'Timeout actualizado', data: { pendingTimeoutSec: updated.pendingTimeoutSec } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// 7) PATCH /admin/commission/max-cancellations
router.patch('/commission/max-cancellations', async (req, res) => {
    try {
        const { maxCancellations } = req.body;
        if (typeof maxCancellations !== 'number' || maxCancellations < 1) {
            return res.status(400).json({ error: true, message: 'Mínimo 1 cancelación permitida' });
        }
        const cfg = await getOrCreateConfig();
        const updated = await prisma_1.default.commissionSetting.update({
            where: { id: cfg.id },
            data: { maxCancellations, updatedBy: req.user.id },
        });
        res.json({ message: 'Máx cancelaciones actualizado', data: { maxCancellations: updated.maxCancellations } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// --- Laboratorios y exámenes a domicilio (ADMIN ve todo) ---
router.get('/lab-exams', async (req, res) => {
    try {
        const { status, page = '1', limit = '50' } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = status ? { status: status } : {};
        const [list, total] = await Promise.all([
            prisma_1.default.labExamRequest.findMany({
                where,
                skip,
                take: parseInt(limit, 10),
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
                    selectedQuote: { include: { laboratory: { select: { id: true, name: true } } } },
                    quotes: { include: { laboratory: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
                },
            }),
            prisma_1.default.labExamRequest.count({ where }),
        ]);
        res.json({ data: list, total, page: parseInt(page, 10) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.get('/laboratories', async (_req, res) => {
    try {
        const labs = await prisma_1.default.laboratory.findMany({
            orderBy: { name: 'asc' },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        res.json({ data: labs });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
