import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import * as svc from '../services/serviceRequests.service';

const router = Router();
router.use(authenticate);

// 1) POST /services — Paciente crea solicitud
router.post('/', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil paciente no encontrado' });

    const sr = await svc.createRequest({ patientId: patient.id, ...req.body });
    res.status(201).json({ message: 'Solicitud creada', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 2) GET /services/me — Paciente: mi historial
router.get('/me', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient) return res.status(404).json({ error: true, message: 'Perfil no encontrado' });

    const list = await prisma.serviceRequest.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    res.json({ data: list });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 3) GET /services/available — Médico: solicitudes Pending
router.get('/available', authorize('DOCTOR'), async (_req: Request, res: Response) => {
  try {
    const list = await prisma.serviceRequest.findMany({
      where: { status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: list });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 4) GET /services/:id — Detalle (dueño, médico asignado o admin)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        transactions: true,
      },
    });
    if (!sr) return res.status(404).json({ error: true, message: 'No encontrada' });

    // Verificar acceso
    const userId = req.user!.id;
    const role = req.user!.role;
    if (role === 'ADMIN') return res.json({ data: sr });

    const patient = await prisma.patientProfile.findUnique({ where: { userId } });
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
    const isOwner = patient?.id === sr.patientId || doctor?.id === sr.doctorId;
    if (!isOwner) return res.status(403).json({ error: true, message: 'Sin acceso' });

    res.json({ data: sr });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// 5) POST /services/:id/accept — Médico acepta
router.post('/:id/accept', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const sr = await svc.acceptRequest(req.params.id, doctor.id);
    res.json({ message: 'Solicitud aceptada', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 6) PATCH /services/:id/status — Médico cambia estado (InProgress, Completed)
router.patch('/:id/status', authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!doctor) return res.status(404).json({ error: true, message: 'Perfil médico no encontrado' });

    const { status, notes } = req.body;

    let sr;
    if (status === 'IN_PROGRESS') {
      sr = await svc.startRequest(req.params.id, doctor.id);
    } else if (status === 'COMPLETED') {
      sr = await svc.completeRequest(req.params.id, doctor.id, notes);
    } else {
      return res.status(400).json({ error: true, message: 'Status no permitido desde esta ruta' });
    }

    res.json({ message: `Estado actualizado a ${status}`, data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 7) DELETE /services/:id — Cancelar (solo PENDING)
router.delete('/:id', authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const sr = await svc.cancelRequest(req.params.id, req.user!.id, req.body.reason);
    res.json({ message: 'Solicitud cancelada', data: sr });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 8) GET /services — Admin: listar todas
router.get('/', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where = status ? { status: status as any } : {};

    const [list, total] = await Promise.all([
      prisma.serviceRequest.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.serviceRequest.count({ where }),
    ]);
    res.json({ data: list, total, page: parseInt(page as string) });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message });
  }
});

export default router;
