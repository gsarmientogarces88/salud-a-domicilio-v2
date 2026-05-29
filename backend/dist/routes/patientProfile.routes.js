"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, roles_1.authorize)('PATIENT'));
const patchSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(100).optional(),
    lastName: zod_1.z.string().trim().min(1).max(100).optional(),
    email: zod_1.z.string().email().max(255).optional(),
    phone: zod_1.z.string().trim().max(40).optional().nullable(),
});
function mapProfileResponse(user) {
    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
        },
    };
}
// GET /patient/profile — solo columnas existentes en `users` (no consulta `patient_profiles`).
router.get('/profile', async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
        res.json({ data: mapProfileResponse(user) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// PATCH /patient/profile — solo actualiza `users`.
router.patch('/profile', async (req, res) => {
    try {
        const parsed = patchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: true, message: parsed.error.message });
        }
        const body = parsed.data;
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true },
        });
        if (!user)
            return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
        if (body.email && body.email.toLowerCase() !== user.email.toLowerCase()) {
            const taken = await prisma_1.default.user.findUnique({ where: { email: body.email.toLowerCase() } });
            if (taken)
                return res.status(409).json({ error: true, message: 'El correo ya está en uso' });
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                ...(body.firstName ? { firstName: body.firstName } : {}),
                ...(body.lastName ? { lastName: body.lastName } : {}),
                ...(body.email ? { email: body.email.toLowerCase() } : {}),
                ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
            },
        });
        const freshUser = await prisma_1.default.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });
        res.json({ data: mapProfileResponse(freshUser) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
