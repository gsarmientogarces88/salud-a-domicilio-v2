import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

function formatPlusCount(n: number): string {
  const safe = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return `+${safe.toLocaleString('es-CL')}`;
}

function formatPlainCount(n: number): string {
  const safe = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return safe.toLocaleString('es-CL');
}

/**
 * GET /public/stats
 * Indicadores públicos (landing + dashboard paciente).
 *
 * Pacientes atendidos = urgencias completadas + agendas confirmadas/completadas + baja de peso completadas
 * Profesionales activos = perfiles con isAvailable = true
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      completedUrgent,
      completedWeight,
      completedScheduledServices,
      confirmedAgenda,
      professionalsActive,
    ] = await Promise.all([
      prisma.serviceRequest.count({
        where: { status: 'COMPLETED', type: 'URGENT' },
      }),
      prisma.serviceRequest.count({
        where: { status: 'COMPLETED', serviceType: 'WEIGHT_PROGRAM' },
      }),
      prisma.serviceRequest.count({
        where: {
          status: 'COMPLETED',
          type: 'SCHEDULED',
          NOT: { serviceType: 'WEIGHT_PROGRAM' },
        },
      }),
      prisma.appointmentRequest.count({
        where: { status: 'CONFIRMED' },
      }),
      prisma.doctorProfile.count({
        where: { isAvailable: true },
      }),
    ]);

    const patientsAttended =
      completedUrgent + completedWeight + completedScheduledServices + confirmedAgenda;

    res.json({
      data: {
        patientsAttended,
        patientsAttendedDisplay: formatPlusCount(patientsAttended),
        professionalsActive,
        professionalsActiveDisplay: formatPlainCount(professionalsActive),
        // aliases for landing Stats already deployed
        professionalsRegistered: professionalsActive,
        professionalsRegisteredDisplay: formatPlainCount(professionalsActive),
        breakdown: {
          urgentCompleted: completedUrgent,
          weightCompleted: completedWeight,
          scheduledServicesCompleted: completedScheduledServices,
          agendaConfirmed: confirmedAgenda,
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message || 'No se pudieron cargar las estadísticas' });
  }
});

export default router;
