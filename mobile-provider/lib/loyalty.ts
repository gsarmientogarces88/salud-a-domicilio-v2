export type LoyaltySummary = {
  pointsBalance: number;
  completedVisitsCount: number;
  level: { code: string; name: string; minPoints: number; maxPoints: number | null };
  nextMilestone: { id: string; code: string; pointsRequired: number; title: string } | null;
  lastReachedMilestone: { id: string; pointsRequired: number; title: string } | null;
  progress: { current: number; target: number; remaining: number; ratio: number };
  lastCompletedAt: string | null;
  unseenMilestones: Array<{
    id: string;
    milestoneId: string;
    pointsRequired: number;
    title: string;
    congratulationTitle: string;
    congratulationBody: string;
    achievedAt: string;
  }>;
  achievedMilestones: Array<{
    id: string;
    pointsRequired: number;
    title: string;
    achievedAt: string;
  }>;
};

export type LoyaltyHistoryRow = {
  id: string;
  date: string;
  type: string;
  concept: string;
  displayId: string;
  patientLabel: string | null;
  points: number;
  balanceAfter: number;
};

export function formatPoints(n: number) {
  return n.toLocaleString('es-CL');
}
