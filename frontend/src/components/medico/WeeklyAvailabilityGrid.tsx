'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WEEK_DAYS,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_BUFFER_MINUTES,
  buildSlotLabels,
  cellKey,
  cellSetToRanges,
  rangesToCellSet,
  inferHourWindow,
  type WeeklyAvailabilityRange,
} from '@/lib/weeklyAvailability';

type Props = {
  value: WeeklyAvailabilityRange[];
  onChange: (next: WeeklyAvailabilityRange[]) => void;
  slotDuration?: number;
  bufferMinutes?: number;
  className?: string;
};

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 6); // 06–22

export default function WeeklyAvailabilityGrid({
  value,
  onChange,
  slotDuration = DEFAULT_SLOT_MINUTES,
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
  className = '',
}: Props) {
  const inferred = useMemo(() => inferHourWindow(value), [value]);
  const [startHour, setStartHour] = useState(inferred.startHour);
  const [endHour, setEndHour] = useState(inferred.endHour);
  const [hydratedFromValue, setHydratedFromValue] = useState(false);

  const cells = useMemo(() => rangesToCellSet(value, slotDuration), [value, slotDuration]);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  const draggingRef = useRef(false);
  const dragActionRef = useRef<'add' | 'remove' | null>(null);

  useEffect(() => {
    if (hydratedFromValue || value.length === 0) return;
    setStartHour(inferred.startHour);
    setEndHour(inferred.endHour);
    setHydratedFromValue(true);
  }, [hydratedFromValue, inferred.endHour, inferred.startHour, value.length]);

  const slots = useMemo(
    () => buildSlotLabels(startHour, endHour, slotDuration),
    [startHour, endHour, slotDuration],
  );

  const emitFromCells = useCallback(
    (nextCells: Set<string>) => {
      onChange(cellSetToRanges(nextCells, { slotDuration, bufferMinutes }));
    },
    [onChange, slotDuration, bufferMinutes],
  );

  const applyCell = useCallback(
    (dayOfWeek: number, timeLabel: string, action: 'add' | 'remove') => {
      const key = cellKey(dayOfWeek, timeLabel);
      const next = new Set(cellsRef.current);
      if (action === 'add') next.add(key);
      else next.delete(key);
      cellsRef.current = next;
      emitFromCells(next);
    },
    [emitFromCells],
  );

  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
      dragActionRef.current = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const countDay = (dayOfWeek: number) => {
    let n = 0;
    for (const key of cells) {
      if (key.startsWith(`${dayOfWeek}-`)) n += 1;
    }
    return n;
  };

  const totalBlocks = cells.size;
  const totalMins = totalBlocks * slotDuration;
  const hours = Math.floor(totalMins / 60);
  const rem = totalMins % 60;
  const timeStr = hours > 0 ? `${hours}h${rem > 0 ? ` ${rem}min` : ''}` : `${rem}min`;

  const selectWeekdays = () => {
    const next = new Set(cellsRef.current);
    for (const day of [1, 2, 3, 4, 5]) {
      for (const label of slots) next.add(cellKey(day, label));
    }
    cellsRef.current = next;
    emitFromCells(next);
  };

  const selectAllDays = () => {
    const next = new Set<string>();
    for (const day of WEEK_DAYS) {
      for (const label of slots) next.add(cellKey(day.dayOfWeek, label));
    }
    cellsRef.current = next;
    emitFromCells(next);
  };

  const clearAll = () => {
    cellsRef.current = new Set();
    emitFromCells(new Set());
  };

  const onStartHourChange = (h: number) => {
    const nextStart = Math.min(h, endHour - 1);
    setStartHour(nextStart);
    const allowed = new Set(buildSlotLabels(nextStart, endHour, slotDuration));
    const next = new Set<string>();
    for (const key of cellsRef.current) {
      const time = key.split('-').slice(1).join('-');
      if (allowed.has(time)) next.add(key);
    }
    cellsRef.current = next;
    emitFromCells(next);
  };

  const onEndHourChange = (h: number) => {
    const nextEnd = Math.max(h, startHour + 1);
    setEndHour(nextEnd);
    const allowed = new Set(buildSlotLabels(startHour, nextEnd, slotDuration));
    const next = new Set<string>();
    for (const key of cellsRef.current) {
      const time = key.split('-').slice(1).join('-');
      if (allowed.has(time)) next.add(key);
    }
    cellsRef.current = next;
    emitFromCells(next);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-gray-800">Agenda y horarios disponibles</h2>
        <p className="mt-1 text-xs text-gray-500">
          Haz clic en las celdas para marcar tus bloques disponibles. Arrastra para seleccionar
          rangos rápidamente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Inicio
          <select
            value={startHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-sky-500 focus:bg-white"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={`s-${h}`} value={h} disabled={h >= endHour}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Fin
          <select
            value={endHour}
            onChange={(e) => onEndHourChange(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-sky-500 focus:bg-white"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={`e-${h}`} value={h} disabled={h <= startHour}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>

        <div className="hidden h-7 w-px bg-slate-200 sm:block" />

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectWeekdays}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Lun–Vie
          </button>
          <button
            type="button"
            onClick={selectAllDays}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Toda la semana
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-sky-500" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-slate-200" />
          No disponible
        </span>
        <span className="ml-auto italic text-[11px]">Arrastra para marcar rangos</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm select-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-[62px] px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400" />
                {WEEK_DAYS.map((day) => {
                  const count = countDay(day.dayOfWeek);
                  const active = count > 0;
                  return (
                    <th
                      key={day.dayOfWeek}
                      className={`min-w-[92px] border-b-2 border-slate-200 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide ${
                        active ? 'bg-sky-50 text-sky-600' : 'bg-white text-slate-700'
                      }`}
                    >
                      {day.short}
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-slate-400">
                        {count > 0 ? `${count} bloques` : '—'}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slots.map((label) => {
                const isHourStart = label.endsWith(':00');
                return (
                  <tr key={label} className={isHourStart ? 'hour-start' : undefined}>
                    <td
                      className={`w-[62px] whitespace-nowrap pr-2.5 text-right text-[11px] tabular-nums align-middle ${
                        isHourStart ? 'font-bold text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </td>
                    {WEEK_DAYS.map((day) => {
                      const key = cellKey(day.dayOfWeek, label);
                      const available = cells.has(key);
                      return (
                        <td
                          key={key}
                          className="cursor-pointer border-l border-slate-100 p-0 text-center"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            draggingRef.current = true;
                            dragActionRef.current = available ? 'remove' : 'add';
                            applyCell(day.dayOfWeek, label, dragActionRef.current);
                          }}
                          onPointerEnter={() => {
                            if (!draggingRef.current || !dragActionRef.current) return;
                            applyCell(day.dayOfWeek, label, dragActionRef.current);
                          }}
                        >
                          <span
                            className={`block h-[22px] border-b border-slate-100 transition-colors ${
                              isHourStart ? 'border-t border-slate-200' : ''
                            } ${
                              available
                                ? 'bg-sky-500 hover:bg-sky-600'
                                : 'bg-transparent hover:bg-sky-100'
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[13px] text-slate-500">
        {totalBlocks > 0 ? (
          <>
            <strong className="text-gray-900">{totalBlocks}</strong> bloques disponibles ·{' '}
            <strong className="text-gray-900">{timeStr}</strong> por semana
          </>
        ) : (
          'Ningún bloque seleccionado aún'
        )}
      </p>
    </div>
  );
}
