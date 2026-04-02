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
router.use(auth_1.authenticate, (0, roles_1.authorize)('PATIENT'));
router.get('/notifications', async (req, res) => {
    try {
        const list = await prisma_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json({ data: list });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
router.patch('/notifications/:id/read', async (req, res) => {
    try {
        const n = await prisma_1.default.notification.updateMany({
            where: { id: req.params.id, userId: req.user.id },
            data: { read: true },
        });
        if (n.count === 0)
            return res.status(404).json({ error: true, message: 'Notificación no encontrada' });
        res.json({ message: 'Ok' });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
