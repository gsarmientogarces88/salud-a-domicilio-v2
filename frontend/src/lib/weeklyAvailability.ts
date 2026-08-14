/** dayOfWeek backend: 0 = Domingo … 6 = Sábado */
export type WeeklyAvailabilityRange = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  bufferMinutes: number;
};

export const WEEK_DAYS = [
  { label: 'Lunes', short: 'LUN', dayOfWeek: 1 },
  { label: 'Martes', short: 'MAR', dayOfWeek: 2 },
  { label: 'Miércoles', short: 'MIÉ', dayOfWeek: 3 },
  { label: 'Jueves', short: 'JUE', dayOfWeek: 4 },
  { label: 'Viernes', short: 'VIE', dayOfWeek: 5 },
  { label: 'Sábado', short: 'SÁB', dayOfWeek: 6 },
  { label: 'Domingo', short: 'DOM', dayOfWeek: 0 },
] as const;

export const DEFAULT_SLOT_MINUTES = 30;
/** Sin margen entre citas: el paciente ve los mismos bloques de 30 min que el doctor. */
export const DEFAULT_BUFFER_MINUTES = 0;

export function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return padTime(h, m);
}

export function cellKey(dayOfWeek: number, timeLabel: string): string {
  return `${dayOfWeek}-${timeLabel}`;
}

export function buildSlotLabels(startHour: number, endHour: number, stepMinutes = DEFAULT_SLOT_MINUTES): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(padTime(h, m));
    }
  }
  return slots;
}

/** Marca celdas de 30 min dentro de cada rango [start, end). */
export function rangesToCellSet(
  ranges: WeeklyAvailabilityRange[],
  stepMinutes = DEFAULT_SLOT_MINUTES,
): Set<string> {
  const next = new Set<string>();
  for (const range of ranges) {
    const start = timeToMinutes(range.startTime);
    const end = timeToMinutes(range.endTime);
    for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
      next.add(cellKey(range.dayOfWeek, minutesToTime(t)));
    }
  }
  return next;
}

/** Fusiona celdas contiguas del mismo día en rangos para la API. */
export function cellSetToRanges(
  cells: Set<string>,
  options?: { slotDuration?: number; bufferMinutes?: number },
): WeeklyAvailabilityRange[] {
  const slotDuration = options?.slotDuration ?? DEFAULT_SLOT_MINUTES;
  const bufferMinutes = options?.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const byDay = new Map<number, number[]>();

  for (const key of cells) {
    const [dayRaw, time] = key.split('-');
    const dayOfWeek = Number(dayRaw);
    if (!Number.isFinite(dayOfWeek) || !time) continue;
    const mins = timeToMinutes(time);
    const list = byDay.get(dayOfWeek) || [];
    list.push(mins);
    byDay.set(dayOfWeek, list);
  }

  const ranges: WeeklyAvailabilityRange[] = [];
  for (const [dayOfWeek, minsList] of byDay) {
    const sorted = [...new Set(minsList)].sort((a, b) => a - b);
    if (sorted.length === 0) continue;

    let runStart = sorted[0];
    let prev = sorted[0];

    const pushRange = (from: number, lastSlotStart: number) => {
      ranges.push({
        dayOfWeek,
        startTime: minutesToTime(from),
        endTime: minutesToTime(lastSlotStart + slotDuration),
        slotDuration,
        bufferMinutes,
      });
    };

    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (cur === prev + slotDuration) {
        prev = cur;
        continue;
      }
      pushRange(runStart, prev);
      runStart = cur;
      prev = cur;
    }
    pushRange(runStart, prev);
  }

  return ranges.sort((a, b) => a.dayOfWeek - b.dayOfWeek || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function inferHourWindow(ranges: WeeklyAvailabilityRange[]): { startHour: number; endHour: number } {
  if (!ranges.length) return { startHour: 8, endHour: 21 };
  let min = 24 * 60;
  let max = 0;
  for (const r of ranges) {
    min = Math.min(min, timeToMinutes(r.startTime));
    max = Math.max(max, timeToMinutes(r.endTime));
  }
  const startHour = Math.min(Math.max(Math.floor(min / 60), 6), 20);
  const endHour = Math.max(Math.min(Math.ceil(max / 60), 23), startHour + 1);
  return { startHour, endHour };
}
