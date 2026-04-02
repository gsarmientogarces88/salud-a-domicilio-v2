'use client';

const DEFAULT_SLOTS = ['10:00', '11:00', '15:00', '16:00', '17:30'];

interface TimeSlotsProps {
  selectedTime: string | null;
  onSelect: (time: string) => void;
  occupied?: string[];
  slots?: string[]; // lista de horarios disponibles; si no viene, se usan DEFAULT_SLOTS
}

export default function TimeSlots({
  selectedTime,
  onSelect,
  occupied = [],
  slots,
}: TimeSlotsProps) {
  const baseSlots = slots && slots.length > 0 ? slots : DEFAULT_SLOTS;

  return (
    <div className="flex flex-wrap gap-2">
      {baseSlots.map((time) => {
        const isOccupied = occupied.includes(time);
        const isSelected = selectedTime === time;

        return (
          <button
            key={time}
            type="button"
            disabled={isOccupied}
            onClick={() => !isOccupied && onSelect(time)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isOccupied
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : isSelected
                ? 'bg-green-500 text-white ring-2 ring-green-300'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
