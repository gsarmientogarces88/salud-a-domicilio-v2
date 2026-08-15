import type { LoyaltyBenefitStatus, LoyaltyBenefitType } from '@prisma/client';

export const LOYALTY_NOTIFICATION_TYPE = 'LOYALTY_MILESTONE';

export type LoyaltyLevelSeed = {
  id: string;
  code: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  sortOrder: number;
};

export type LoyaltyMilestoneSeed = {
  id: string;
  code: string;
  pointsRequired: number;
  sortOrder: number;
  title: string;
  congratulationTitle: string;
  congratulationBody: string;
  benefitType: LoyaltyBenefitType;
  benefitStatus: LoyaltyBenefitStatus;
};

/** Códigos estables. Los nombres se pueden cambiar en BD (p. ej. Bronze / Silver / Gold). */
export const DEFAULT_LOYALTY_LEVELS: LoyaltyLevelSeed[] = [
  { id: 'level_initial', code: 'LEVEL_INITIAL', name: 'Nivel Inicial', minPoints: 0, maxPoints: 99, sortOrder: 1 },
  { id: 'level_100', code: 'LEVEL_100', name: 'Nivel 100', minPoints: 100, maxPoints: 199, sortOrder: 2 },
  { id: 'level_200', code: 'LEVEL_200', name: 'Nivel 200', minPoints: 200, maxPoints: 499, sortOrder: 3 },
  { id: 'level_500', code: 'LEVEL_500', name: 'Nivel 500', minPoints: 500, maxPoints: 999, sortOrder: 4 },
  { id: 'level_1000', code: 'LEVEL_1000', name: 'Nivel 1.000', minPoints: 1000, maxPoints: 1999, sortOrder: 5 },
  { id: 'level_2000', code: 'LEVEL_2000', name: 'Nivel 2.000', minPoints: 2000, maxPoints: null, sortOrder: 6 },
];

export const DEFAULT_LOYALTY_MILESTONES: LoyaltyMilestoneSeed[] = [
  {
    id: 'milestone_100',
    code: 'MILESTONE_100',
    pointsRequired: 100,
    sortOrder: 1,
    title: '100 atenciones',
    congratulationTitle: '¡Felicitaciones! Has alcanzado 100 atenciones realizadas en Medicilio.',
    congratulationBody:
      'Has completado 100 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.',
  },
  {
    id: 'milestone_200',
    code: 'MILESTONE_200',
    pointsRequired: 200,
    sortOrder: 2,
    title: '200 atenciones',
    congratulationTitle: '¡Felicitaciones! Has alcanzado 200 atenciones realizadas en Medicilio.',
    congratulationBody:
      'Has completado 200 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.',
  },
  {
    id: 'milestone_500',
    code: 'MILESTONE_500',
    pointsRequired: 500,
    sortOrder: 3,
    title: '500 atenciones',
    congratulationTitle: '¡Felicitaciones! Has alcanzado 500 atenciones realizadas en Medicilio.',
    congratulationBody:
      'Has completado 500 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.',
  },
  {
    id: 'milestone_1000',
    code: 'MILESTONE_1000',
    pointsRequired: 1000,
    sortOrder: 4,
    title: '1.000 atenciones',
    congratulationTitle: '¡Felicitaciones! Has alcanzado 1.000 atenciones realizadas en Medicilio.',
    congratulationBody:
      'Has completado 1.000 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.',
  },
  {
    id: 'milestone_2000',
    code: 'MILESTONE_2000',
    pointsRequired: 2000,
    sortOrder: 5,
    title: '2.000 atenciones',
    congratulationTitle: '¡Felicitaciones! Has alcanzado 2.000 atenciones realizadas en Medicilio.',
    congratulationBody:
      'Has completado 2.000 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.',
  },
].map((m) => ({ ...m, benefitType: 'NONE' as const, benefitStatus: 'NOT_CONFIGURED' as const }));

export function formatServiceDisplayId(serviceRequestId: string): string {
  const suffix = serviceRequestId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000000';
  return `MED-${suffix}`;
}

export function resolveLevelFromPoints<T extends { code: string; minPoints: number; maxPoints: number | null }>(
  points: number,
  levels: T[],
): T | null {
  const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const sorted = [...levels].sort((a, b) => a.minPoints - b.minPoints);
  let current: T | null = sorted[0] ?? null;
  for (const level of sorted) {
    const inRange = safe >= level.minPoints && (level.maxPoints == null || safe <= level.maxPoints);
    if (inRange) current = level;
  }
  return current;
}

export function nextMilestoneFromPoints<T extends { pointsRequired: number }>(
  points: number,
  milestones: T[],
): T | null {
  const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const sorted = [...milestones].sort((a, b) => a.pointsRequired - b.pointsRequired);
  return sorted.find((m) => m.pointsRequired > safe) ?? null;
}

export function formatPatientPublicLabel(input: {
  pacienteNombre?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string | null {
  const attended = input.pacienteNombre?.trim();
  if (attended) {
    const parts = attended.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
  }
  const first = input.firstName?.trim();
  const last = input.lastName?.trim();
  if (!first) return null;
  if (!last) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}
