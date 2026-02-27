import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import prisma from '../lib/prisma';
import * as paySvc from '../services/payments.service';

const router = Router();

// 1) POST /payments/:serviceId/create — Paciente crea transacción pendiente
router.post('/:serviceId/create', authenticate, authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({ where: { id: req.params.serviceId } });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });

    // Verificar dueño
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient || patient.id !== sr.patientId) {
      return res.status(403).json({ error: true, message: 'No es tu solicitud' });
    }

    const provider = req.body.provider || 'mercadopago';
    const tx = await paySvc.createTransaction(sr.id, provider, sr.totalAmount);
    res.status(201).json({ message: 'Transacción creada', data: tx });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 2) POST /payments/:serviceId/confirm — Paciente confirma pago
router.post('/:serviceId/confirm', authenticate, authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.serviceId },
      include: { transactions: { where: { status: 'COMPLETED' }, take: 1 } },
    });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });

    // Verificar dueño
    const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user!.id } });
    if (!patient || patient.id !== sr.patientId) {
      return res.status(403).json({ error: true, message: 'No es tu solicitud' });
    }

    // Evitar doble confirmación
    if (sr.transactions.length > 0) {
      return res.status(409).json({ error: true, message: 'Pago ya confirmado' });
    }

    const providerRef = req.body.providerRef || `placeholder-${Date.now()}`;
    const result = await paySvc.markAsPaid(sr.id, providerRef);
    res.json({ message: 'Pago confirmado', data: result });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 3) POST /payments/:serviceId/refund — Admin reembolsa
router.post('/:serviceId/refund', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const sr = await prisma.serviceRequest.findUnique({ where: { id: req.params.serviceId } });
    if (!sr) return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });

    const result = await paySvc.refund(sr.id);
    res.json({ message: 'Reembolso procesado', data: result });
  } catch (e: any) {
    res.status(400).json({ error: true, message: e.message });
  }
});

// 4) POST /payments/webhook — Placeholder pasarela de pago
router.post('/webhook', (_req: Request, res: Response) => {
  // TODO Fase 2: validar firma, procesar evento de Stripe/MercadoPago
  res.status(200).json({ received: true });
});

export default router;
