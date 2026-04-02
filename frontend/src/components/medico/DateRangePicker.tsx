'use client';

interface DateRangePickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

export default function DateRangePicker({ selectedDate, onSelect }: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  const formatDate = (d: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

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
              ? 'bg-green-500 text-white ring-2 ring-green-300'
              : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
          }`}
        >
          {isToday(d) ? 'Hoy, ' : ''}
          {formatDate(d)}
        </button>
      ))}
    </div>
  );
}
