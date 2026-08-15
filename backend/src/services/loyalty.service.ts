import {
  LoyaltySourceType,
  LoyaltyTransactionType,
  Prisma,
  type LoyaltyLevel,
  type LoyaltyMilestone,
} from '@prisma/client';
import prisma from '../lib/prisma';
import {
  DEFAULT_LOYALTY_LEVELS,
  DEFAULT_LOYALTY_MILESTONES,
  LOYALTY_NOTIFICATION_TYPE,
  formatServiceDisplayId,
  nextMilestoneFromPoints,
  resolveLevelFromPoints,
  formatPatientPublicLabel,
} from '../lib/loyalty';

type Db = Prisma.TransactionClient | typeof prisma;

export type CreditVisitInput = {
  id: string;
  doctorId: string | null;
  status: string;
  completedAt: Date | null;
  pacienteNombre?: string | null;
};

export type CreditVisitResult = {
  credited: boolean;
  pointsAwarded: number;
  balanceAfter: number | null;
  newlyAchieved: Array<{
    id: string;
    milestoneId: string;
    pointsRequired: number;
    title: string;
    congratulationTitle: string;
    congratulationBody: string;
  }>;
};

const EMPTY_CREDIT: CreditVisitResult = {
  credited: false,
  pointsAwarded: 0,
  balanceAfter: null,
  newlyAchieved: [],
};

let catalogReady = false;

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export async function ensureLoyaltyCatalog(db: Db = prisma): Promise<void> {
  if (catalogReady && db === prisma) return;

  await db.loyaltySetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', pointsPerCompletedVisit: 1 },
    update: {},
  });

  for (const level of DEFAULT_LOYALTY_LEVELS) {
    await db.loyaltyLevel.upsert({
      where: { id: level.id },
      create: { ...level, isActive: true },
      update: {
        minPoints: level.minPoints,
        maxPoints: level.maxPoints,
        sortOrder: level.sortOrder,
        isActive: true,
      },
    });
  }

  for (const milestone of DEFAULT_LOYALTY_MILESTONES) {
    await db.loyaltyMilestone.upsert({
      where: { id: milestone.id },
      create: { ...milestone, isActive: true },
      update: {
        pointsRequired: milestone.pointsRequired,
        sortOrder: milestone.sortOrder,
        isActive: true,
      },
    });
  }

  if (db === prisma) {
    catalogReady = true;
    cachedCatalog = await loadActiveCatalog(prisma);
  }
}

async function getPointsPerCompletedVisit(db: Db): Promise<number> {
  const setting = await db.loyaltySetting.findUnique({ where: { id: 'default' } });
  const n = setting?.pointsPerCompletedVisit ?? 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/**
 * Puntos de una atención completada. Hoy usa la tarifa base del catálogo;
 * más adelante puede sumar horario especial, campañas, etc. sin cambiar el ledger.
 */
export async function computeVisitPoints(db: Db, _visit: CreditVisitInput): Promise<number> {
  return getPointsPerCompletedVisit(db);
}

async function loadActiveCatalog(db: Db) {
  const [levels, milestones] = await Promise.all([
    db.loyaltyLevel.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } }),
    db.loyaltyMilestone.findMany({ where: { isActive: true }, orderBy: { pointsRequired: 'asc' } }),
  ]);
  return { levels, milestones };
}

let cachedCatalog: { levels: LoyaltyLevel[]; milestones: LoyaltyMilestone[] } | null = null;

async function awardCrossedMilestones(
  tx: Prisma.TransactionClient,
  params: {
    doctorLoyaltyId: string;
    doctorUserId: string | null;
    previousBalance: number;
    newBalance: number;
    achievedAt: Date;
    notify: boolean;
    milestones: LoyaltyMilestone[];
  },
): Promise<CreditVisitResult['newlyAchieved']> {
  const crossed = params.milestones.filter(
    (m) => m.pointsRequired > params.previousBalance && m.pointsRequired <= params.newBalance,
  );
  const newly: CreditVisitResult['newlyAchieved'] = [];

  for (const milestone of crossed) {
    try {
      const row = await tx.doctorLoyaltyMilestone.create({
        data: {
          doctorLoyaltyId: params.doctorLoyaltyId,
          milestoneId: milestone.id,
          achievedAt: params.achievedAt,
          notifiedAt: params.notify ? null : params.achievedAt,
          benefitUnlockedAt: params.achievedAt,
        },
      });

      if (params.notify && params.doctorUserId) {
        const notification = await tx.notification.create({
          data: {
            userId: params.doctorUserId,
            type: LOYALTY_NOTIFICATION_TYPE,
            title: '🎉 ¡Nueva meta alcanzada!',
            body: milestone.congratulationBody,
            link: '/dashboard/doctor',
          },
        });
        await tx.doctorLoyaltyMilestone.update({
          where: { id: row.id },
          data: { notificationId: notification.id },
        });
      }

      newly.push({
        id: row.id,
        milestoneId: milestone.id,
        pointsRequired: milestone.pointsRequired,
        title: milestone.title,
        congratulationTitle: milestone.congratulationTitle,
        congratulationBody: milestone.congratulationBody,
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }

  return newly;
}

export async function creditCompletedVisit(
  db: Db,
  visit: CreditVisitInput,
  options: { notify?: boolean } = {},
): Promise<CreditVisitResult> {
  const notify = options.notify !== false;

  if (!visit.doctorId || visit.status !== 'COMPLETED') {
    return EMPTY_CREDIT;
  }

  await ensureLoyaltyCatalog();

  const existing = await db.loyaltyTransaction.findUnique({
    where: {
      sourceType_sourceId_type: {
        sourceType: LoyaltySourceType.SERVICE_REQUEST,
        sourceId: visit.id,
        type: LoyaltyTransactionType.VISIT_COMPLETED,
      },
    },
    select: { points: true, balanceAfter: true },
  });
  if (existing) {
    return {
      credited: false,
      pointsAwarded: 0,
      balanceAfter: existing.balanceAfter,
      newlyAchieved: [],
    };
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CreditVisitResult> => {
    const already = await tx.loyaltyTransaction.findUnique({
      where: {
        sourceType_sourceId_type: {
          sourceType: LoyaltySourceType.SERVICE_REQUEST,
          sourceId: visit.id,
          type: LoyaltyTransactionType.VISIT_COMPLETED,
        },
      },
      select: { points: true, balanceAfter: true },
    });
    if (already) {
      return {
        credited: false,
        pointsAwarded: 0,
        balanceAfter: already.balanceAfter,
        newlyAchieved: [],
      };
    }

    const points = await computeVisitPoints(tx, visit);
    if (points <= 0) return EMPTY_CREDIT;

    const loyalty = await tx.doctorLoyalty.upsert({
      where: { doctorId: visit.doctorId! },
      create: {
        doctorId: visit.doctorId!,
        pointsBalance: 0,
        completedVisitsCount: 0,
        currentLevelCode: 'LEVEL_INITIAL',
      },
      update: {},
    });

    const occurredAt = visit.completedAt ?? new Date();
    const displayId = formatServiceDisplayId(visit.id);
    const catalog = cachedCatalog ?? (await loadActiveCatalog(tx));

    try {
      await tx.loyaltyTransaction.create({
        data: {
          doctorLoyaltyId: loyalty.id,
          type: LoyaltyTransactionType.VISIT_COMPLETED,
          sourceType: LoyaltySourceType.SERVICE_REQUEST,
          sourceId: visit.id,
          points,
          balanceAfter: 0,
          concept: `Atención #${displayId} completada`,
          occurredAt,
          metadata: {
            displayId,
            visitCompletedAt: occurredAt.toISOString(),
          },
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return {
          credited: false,
          pointsAwarded: 0,
          balanceAfter: loyalty.pointsBalance,
          newlyAchieved: [],
        };
      }
      throw e;
    }

    const updated = await tx.doctorLoyalty.update({
      where: { id: loyalty.id },
      data: {
        pointsBalance: { increment: points },
        completedVisitsCount: { increment: 1 },
        lastCompletedAt: occurredAt,
      },
    });
    const previousBalance = updated.pointsBalance - points;
    const newBalance = updated.pointsBalance;
    const level = resolveLevelFromPoints(newBalance, catalog.levels);

    await tx.doctorLoyalty.update({
      where: { id: loyalty.id },
      data: { currentLevelCode: level?.code ?? updated.currentLevelCode },
    });
    await tx.loyaltyTransaction.update({
      where: {
        sourceType_sourceId_type: {
          sourceType: LoyaltySourceType.SERVICE_REQUEST,
          sourceId: visit.id,
          type: LoyaltyTransactionType.VISIT_COMPLETED,
        },
      },
      data: { balanceAfter: newBalance },
    });

    const doctor = await tx.doctorProfile.findUnique({
      where: { id: visit.doctorId! },
      select: { userId: true },
    });

    const newlyAchieved = await awardCrossedMilestones(tx, {
      doctorLoyaltyId: loyalty.id,
      doctorUserId: doctor?.userId ?? null,
      previousBalance,
      newBalance,
      achievedAt: occurredAt,
      notify,
      milestones: catalog.milestones,
    });

    return {
      credited: true,
      pointsAwarded: points,
      balanceAfter: newBalance,
      newlyAchieved,
    };
  };

  if (db === prisma) {
    return prisma.$transaction((tx) => run(tx), { timeout: 20000, maxWait: 10000 });
  }
  return run(db);
}

/**
 * Acredita puntos tras completar una atención. Nunca debe impedir el cierre de la visita:
 * si el ledger falla, se registra el error y la atención permanece COMPLETED.
 */
export async function creditCompletedVisitSafe(
  db: Db,
  visit: CreditVisitInput,
  options: { notify?: boolean } = {},
): Promise<CreditVisitResult> {
  try {
    return await creditCompletedVisit(db, visit, options);
  } catch (e) {
    console.error('[loyalty.creditCompletedVisit]', visit.id, e);
    return EMPTY_CREDIT;
  }
}

function serializeLevel(level: LoyaltyLevel | null) {
  if (!level) {
    return {
      code: 'LEVEL_INITIAL',
      name: 'Nivel Inicial',
      minPoints: 0,
      maxPoints: 99,
    };
  }
  return {
    code: level.code,
    name: level.name,
    minPoints: level.minPoints,
    maxPoints: level.maxPoints,
  };
}

function progressToward(
  points: number,
  next: { pointsRequired: number } | null,
  lastMilestonePoints: number,
) {
  const target = next?.pointsRequired ?? Math.max(points, lastMilestonePoints);
  const remaining = next ? Math.max(0, next.pointsRequired - points) : 0;
  const ratio = target <= 0 ? 1 : Math.min(1, Math.max(0, points / target));
  return { current: points, target, remaining, ratio };
}

export async function getDoctorLoyaltySummary(doctorId: string) {
  await ensureLoyaltyCatalog();
  const { levels, milestones } = await loadActiveCatalog(prisma);

  const loyalty = await prisma.doctorLoyalty.findUnique({
    where: { doctorId },
    include: {
      milestones: {
        include: { milestone: true },
        orderBy: { achievedAt: 'asc' },
      },
    },
  });

  const points = loyalty?.pointsBalance ?? 0;
  const visits = loyalty?.completedVisitsCount ?? 0;
  const level = resolveLevelFromPoints(points, levels);
  const nextMilestone = nextMilestoneFromPoints(points, milestones);
  const lastReached = [...milestones].reverse().find((m) => m.pointsRequired <= points) ?? null;
  const progress = progressToward(points, nextMilestone, lastReached?.pointsRequired ?? 0);

  const unseenMilestones = (loyalty?.milestones ?? [])
    .filter((row) => row.notifiedAt == null)
    .map((row) => ({
      id: row.id,
      milestoneId: row.milestoneId,
      pointsRequired: row.milestone.pointsRequired,
      title: row.milestone.title,
      congratulationTitle: row.milestone.congratulationTitle,
      congratulationBody: row.milestone.congratulationBody,
      achievedAt: row.achievedAt,
    }));

  const achievedMilestones = (loyalty?.milestones ?? []).map((row) => ({
    id: row.id,
    milestoneId: row.milestoneId,
    pointsRequired: row.milestone.pointsRequired,
    title: row.milestone.title,
    achievedAt: row.achievedAt,
    benefitClaimed: row.benefitClaimed,
    benefitName: row.milestone.benefitName,
    benefitStatus: row.milestone.benefitStatus,
  }));

  return {
    pointsBalance: points,
    completedVisitsCount: visits,
    level: serializeLevel(level),
    nextMilestone: nextMilestone
      ? {
          id: nextMilestone.id,
          code: nextMilestone.code,
          pointsRequired: nextMilestone.pointsRequired,
          title: nextMilestone.title,
        }
      : null,
    lastReachedMilestone: lastReached
      ? {
          id: lastReached.id,
          pointsRequired: lastReached.pointsRequired,
          title: lastReached.title,
        }
      : null,
    progress,
    lastCompletedAt: loyalty?.lastCompletedAt ?? null,
    unseenMilestones,
    achievedMilestones,
  };
}

export async function getDoctorLoyaltyHistory(
  doctorId: string,
  opts: { page?: number; limit?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const skip = (page - 1) * limit;

  const loyalty = await prisma.doctorLoyalty.findUnique({
    where: { doctorId },
    select: { id: true },
  });
  if (!loyalty) {
    return { data: [], total: 0, page, limit };
  }

  const [rows, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where: { doctorLoyaltyId: loyalty.id },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({ where: { doctorLoyaltyId: loyalty.id } }),
  ]);

  const serviceIds = rows
    .filter((r) => r.sourceType === LoyaltySourceType.SERVICE_REQUEST)
    .map((r) => r.sourceId);

  const services =
    serviceIds.length === 0
      ? []
      : await prisma.serviceRequest.findMany({
          where: { id: { in: serviceIds } },
          select: {
            id: true,
            pacienteNombre: true,
            patient: {
              select: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });
  const byId = new Map(services.map((s) => [s.id, s]));

  const data = rows.map((row) => {
    const sr = byId.get(row.sourceId);
    const patientLabel = sr
      ? formatPatientPublicLabel({
          pacienteNombre: sr.pacienteNombre,
          firstName: sr.patient.user.firstName,
          lastName: sr.patient.user.lastName,
        })
      : null;
    const displayId =
      row.sourceType === LoyaltySourceType.SERVICE_REQUEST
        ? formatServiceDisplayId(row.sourceId)
        : row.sourceId;

    return {
      id: row.id,
      date: row.occurredAt,
      type: row.type,
      concept: row.concept,
      displayId,
      patientLabel,
      points: row.points,
      balanceAfter: row.balanceAfter,
    };
  });

  return { data, total, page, limit };
}

export async function acknowledgeLoyaltyMilestone(doctorId: string, achievementId: string) {
  const loyalty = await prisma.doctorLoyalty.findUnique({
    where: { doctorId },
    select: { id: true },
  });
  if (!loyalty) return false;

  const row = await prisma.doctorLoyaltyMilestone.findFirst({
    where: { id: achievementId, doctorLoyaltyId: loyalty.id },
  });
  if (!row) return false;

  await prisma.doctorLoyaltyMilestone.update({
    where: { id: row.id },
    data: { notifiedAt: row.notifiedAt ?? new Date() },
  });

  if (row.notificationId) {
    await prisma.notification.updateMany({
      where: { id: row.notificationId },
      data: { read: true },
    });
  }
  return true;
}

export async function listDoctorsLoyalty(opts: { q?: string; page?: number; limit?: number } = {}) {
  await ensureLoyaltyCatalog();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;
  const q = opts.q?.trim() ?? '';

  const where: Prisma.DoctorProfileWhereInput = q
    ? {
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { userId: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { firstName: { contains: q, mode: 'insensitive' } } },
          { user: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      }
    : {};

  const [doctors, total, levels, milestones] = await Promise.all([
    prisma.doctorProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        loyalty: {
          include: {
            milestones: {
              include: { milestone: { select: { pointsRequired: true, title: true } } },
              orderBy: { achievedAt: 'asc' },
            },
          },
        },
      },
    }),
    prisma.doctorProfile.count({ where }),
    prisma.loyaltyLevel.findMany({ where: { isActive: true }, orderBy: { minPoints: 'asc' } }),
    prisma.loyaltyMilestone.findMany({ where: { isActive: true }, orderBy: { pointsRequired: 'asc' } }),
  ]);

  const data = doctors.map((doc) => {
    const points = doc.loyalty?.pointsBalance ?? 0;
    const visits = doc.loyalty?.completedVisitsCount ?? 0;
    const level = resolveLevelFromPoints(points, levels);
    const next = nextMilestoneFromPoints(points, milestones);
    return {
      doctorId: doc.id,
      userId: doc.user.id,
      name: `${doc.user.firstName} ${doc.user.lastName}`.trim(),
      email: doc.user.email,
      specialty: doc.specialty,
      completedVisitsCount: visits,
      pointsBalance: points,
      level: serializeLevel(level),
      nextMilestone: next
        ? { pointsRequired: next.pointsRequired, title: next.title }
        : null,
      lastCompletedAt: doc.loyalty?.lastCompletedAt ?? null,
      milestones: (doc.loyalty?.milestones ?? []).map((m) => ({
        pointsRequired: m.milestone.pointsRequired,
        title: m.milestone.title,
        achievedAt: m.achievedAt,
      })),
    };
  });

  return { data, total, page, limit };
}

/**
 * Recorre atenciones COMPLETED históricas y acredita puntos de forma idempotente.
 * Segura de ejecutar más de una vez: el índice único (sourceType, sourceId, type) evita duplicados.
 */
export async function backfillDoctorLoyalty(options: { notify?: boolean } = {}): Promise<{
  scanned: number;
  credited: number;
  skipped: number;
  errors: number;
}> {
  await ensureLoyaltyCatalog();
  const notify = options.notify === true;

  const visits = await prisma.serviceRequest.findMany({
    where: { status: 'COMPLETED', doctorId: { not: null } },
    select: {
      id: true,
      doctorId: true,
      status: true,
      completedAt: true,
      createdAt: true,
      pacienteNombre: true,
    },
    orderBy: [{ completedAt: 'asc' }, { createdAt: 'asc' }],
  });

  let credited = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < visits.length; i += 1) {
    const visit = visits[i];
    try {
      const result = await creditCompletedVisit(
        prisma,
        {
          id: visit.id,
          doctorId: visit.doctorId,
          status: visit.status,
          completedAt: visit.completedAt ?? visit.createdAt,
          pacienteNombre: visit.pacienteNombre,
        },
        { notify },
      );
      if (result.credited) credited += 1;
      else skipped += 1;
    } catch (e) {
      errors += 1;
      console.error('[loyalty.backfill] visit failed', visit.id, e);
    }
    if ((i + 1) % 10 === 0 || i === visits.length - 1) {
      console.error(`[loyalty.backfill] ${i + 1}/${visits.length} (credited=${credited} skipped=${skipped} errors=${errors})`);
    }
  }

  return { scanned: visits.length, credited, skipped, errors };
}
