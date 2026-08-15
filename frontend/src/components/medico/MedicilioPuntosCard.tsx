'use client';

import Link from 'next/link';

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

function formatPoints(n: number) {
  return n.toLocaleString('es-CL');
}

export default function MedicilioPuntosCard({
  summary,
  compact,
}: {
  summary: LoyaltySummary;
  compact?: boolean;
}) {
  const { pointsBalance, completedVisitsCount, level, nextMilestone, lastReachedMilestone, progress } =
    summary;
  const pct = Math.round(progress.ratio * 100);
  const remainingLabel = nextMilestone
    ? progress.remaining === 1
      ? 'Te falta 1 atención para alcanzar tu próxima meta.'
      : `Te faltan ${formatPoints(progress.remaining)} atenciones para alcanzar tu próxima meta.`
    : 'Has alcanzado la meta más alta disponible por ahora.';

  return (
    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm ring-1 ring-sky-100/70 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Medicilio Puntos</p>
          <p className="mt-0.5 text-sm text-gray-500">Reconocimiento por atenciones completadas</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
          {level.name}
        </span>
      </div>

      <div className={`grid gap-4 ${compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
        <div>
          <p className="text-4xl font-bold tabular-nums tracking-tight text-gray-900 md:text-5xl">
            {formatPoints(pointsBalance)}
            <span className="ml-2 text-base font-semibold text-gray-500 md:text-lg">puntos</span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatPoints(completedVisitsCount)} atenciones completadas
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Próxima meta</p>
          {nextMilestone ? (
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatPoints(nextMilestone.pointsRequired)} atenciones
            </p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-gray-900">Todas las metas actuales</p>
          )}
          {lastReachedMilestone ? (
            <p className="mt-1 text-xs text-emerald-700">
              Meta alcanzada: {formatPoints(lastReachedMilestone.pointsRequired)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium tabular-nums text-gray-700">
            {formatPoints(progress.current)} / {formatPoints(progress.target)}
          </span>
          <span className="text-xs text-gray-500">{pct}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress.current}
          aria-valuemin={0}
          aria-valuemax={progress.target}
          aria-label="Progreso hacia la próxima meta"
        >
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">{remainingLabel}</p>
      </div>

      {!compact ? (
        <div className="mt-4 flex justify-end">
          <Link
            href="/dashboard/doctor/puntos"
            className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            Ver historial de puntos
          </Link>
        </div>
      ) : null}
    </section>
  );
}
