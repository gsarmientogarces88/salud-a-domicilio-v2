import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /auth/me — Usuario actual (requiere token)
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) return res.status(404).json({ error: true, message: 'Usuario no encontrado' });
    res.json({ data: { user } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: true, message: 'Campos requeridos: email, password, firstName, lastName' });
    }

    // Solo PATIENT o DOCTOR por registro público
    const validRole = role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: true, message: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
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
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true, createdAt: true },
    });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

    res.status(201).json({ message: 'Registro exitoso', data: { user, token } });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /auth/laboratory/login — solo rol LABORATORY (panel independiente)
router.post('/laboratory/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email y password requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    if (user.role !== 'LABORATORY') {
      return res.status(403).json({ error: true, message: 'Acceso solo para laboratorios' });
    }
    if (user.isBanned) return res.status(403).json({ error: true, message: 'Usuario baneado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

    res.json({
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email y password requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    if (user.role === 'LABORATORY') {
      return res.status(403).json({
        error: true,
        message: 'Los laboratorios deben iniciar sesión en el acceso de laboratorio',
      });
    }
    if (user.isBanned) return res.status(403).json({ error: true, message: 'Usuario baneado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
