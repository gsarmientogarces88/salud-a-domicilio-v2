"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /auth/me — Usuario actual (requiere token)
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, role: true, firstName: true, lastName: true },
        });
        if (!user)
            return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
        res.json({ data: { user } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, role } = req.body;
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: true, message: 'Campos requeridos: email, password, firstName, lastName' });
        }
        // Solo PATIENT o DOCTOR por registro público
        const validRole = role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
        const exists = await prisma_1.default.user.findUnique({ where: { email } });
        if (exists)
            return res.status(409).json({ error: true, message: 'Email ya registrado' });
        const hashed = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashed,
                firstName,
                lastName,
                phone,
                role: validRole,
                ...(validRole === 'PATIENT' ? { patientProfile: { create: {} } } : {}),
                ...(validRole === 'DOCTOR' ? {
                    doctorProfile: {
                        create: {
                            specialty: req.body.specialty || 'General',
                            licenseNumber: req.body.licenseNumber || '',
                            baseFee: parseInt(req.body.baseFee) || 30000,
                        },
                    },
                } : {}),
            },
            select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        res.status(201).json({ message: 'Registro exitoso', data: { user, token } });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /auth/laboratory/login — solo rol LABORATORY (panel independiente)
router.post('/laboratory/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: true, message: 'Email y password requeridos' });
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
        if (user.role !== 'LABORATORY') {
            return res.status(403).json({ error: true, message: 'Acceso solo para laboratorios' });
        }
        if (user.isBanned)
            return res.status(403).json({ error: true, message: 'Usuario baneado' });
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        res.json({
            data: {
                token,
                user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            },
        });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: true, message: 'Email y password requeridos' });
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
        if (user.role === 'LABORATORY') {
            return res.status(403).json({
                error: true,
                message: 'Los laboratorios deben iniciar sesión en el acceso de laboratorio',
            });
        }
        if (user.isBanned)
            return res.status(403).json({ error: true, message: 'Usuario baneado' });
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        res.json({
            data: {
                token,
                user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            },
        });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
