'use client';

import {
  formatDayChip,
  formatDayLong,
  formatDayShortSelected,
  getMockSlotsForDate,
  isSameDay,
  nextBusinessDays,
} from './agendarTypes';

const PRIMARY = '#1A7A5E';

type CalendarioHorasProps = {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onContinue: () => void;
};

export default function CalendarioHoras({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onContinue,
}: CalendarioHorasProps) {
  const days = nextBusinessDays(5);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots = selectedDate ? getMockSlotsForDate(selectedDate) : [];
  const canContinue = !!selectedDate && !!selectedTime;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#0F5240]">Elige tu fecha y hora</h2>
        <p className="mt-1 text-sm text-[#3B6D11]">
          Próximos 5 días hábiles · telemedicina Baja de peso
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`relative min-w-[4.5rem] rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? 'text-white shadow-sm'
                  : 'border border-[#CDE8DE] bg-[#E6F4F0] text-[#0F5240] hover:border-[#1A7A5E]'
              }`}
              style={selected ? { background: PRIMARY } : undefined}
            >
              {formatDayChip(day)}
              {isToday && (
                <span
                  className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    selected ? 'bg-white text-[#1A7A5E]' : 'bg-[#1A7A5E] text-white'
                  }`}
                >
                  Hoy
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div>
          <p className="mb-3 text-sm font-medium text-[#0F5240]">
            Horas disponibles — {formatDayLong(selectedDate)}
          </p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const occupied = slot.status === 'occupied';
              const active = selectedTime === slot.time && !occupied;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={occupied}
                  onClick={() => onSelectTime(slot.time)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    occupied
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400 line-through'
                      : active
                        ? 'text-white'
                        : 'border border-[#CDE8DE] bg-white text-[#0F5240] hover:border-[#1A7A5E]'
                  }`}
                  style={active ? { background: PRIMARY } : undefined}
                  title={occupied ? 'Ocupado' : undefined}
                >
                  {occupied ? `${slot.time} · ocupado` : slot.time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canContinue && selectedDate && selectedTime && (
        <p className="rounded-[12px] bg-[#E6F4F0] px-3 py-2 text-sm text-[#0F5240]">
          ✓ Seleccionado: {formatDayShortSelected(selectedDate)} · {selectedTime}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="rounded-[12px] px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: PRIMARY }}
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
