'use client';

import { MEDICAL_SPECIALTIES } from '@/data/medicalSpecialties';

interface SpecialtySidebarProps {
  active: string;
  onSelect: (specialty: string) => void;
}

export default function SpecialtySidebar({ active, onSelect }: SpecialtySidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm lg:w-56">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Especialidad</p>
      <nav className="flex flex-col gap-0.5">
        {MEDICAL_SPECIALTIES.map((s) => {
          const isActive = active === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
