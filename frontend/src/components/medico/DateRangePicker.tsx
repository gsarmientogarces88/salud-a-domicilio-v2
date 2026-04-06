'use client';

interface DateRangePickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  /** Días desde hoy para el primer botón (1 = mañana; no permitir mismo día). */
  fromDayOffset?: number;
  /** Cuántos días mostrar desde el primero. */
  dayCount?: number;
}

export default function DateRangePicker({
  selectedDate,
  onSelect,
  fromDayOffset = 1,
  dayCount = 14,
}: DateRangePickerProps) {
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + fromDayOffset + i);
    dates.push(d);
  }

  const formatDate = (d: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const isSelected = (d: Date) =>
    selectedDate &&
    d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getFullYear() === selectedDate.getFullYear();

  return (
    <div className="flex flex-wrap gap-2">
      {dates.map((d) => (
        <button
          key={d.toISOString()}
          type="button"
          onClick={() => onSelect(d)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            isSelected(d)
              ? 'bg-sky-600 text-white ring-2 ring-sky-300'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {formatDate(d)}
        </button>
      ))}
    </div>
  );
}
