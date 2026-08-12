'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { LANDING_STATS } from '@/lib/landingConfig';

type PublicStats = {
  patientsAttendedDisplay: string;
  professionalsActiveDisplay?: string;
  professionalsRegisteredDisplay?: string;
};

type StatItem = {
  value: string;
  label: string;
};

type StatsProps = {
  className?: string;
};

const FALLBACK_ITEMS: StatItem[] = [
  { value: LANDING_STATS.patientsServed, label: LANDING_STATS.patientsLabel },
  { value: LANDING_STATS.professionals, label: LANDING_STATS.professionalsLabel },
  { value: LANDING_STATS.rating, label: LANDING_STATS.ratingLabel },
  { value: LANDING_STATS.avgArrival, label: LANDING_STATS.avgArrivalLabel },
];

export default function Stats({ className = '' }: StatsProps) {
  const [items, setItems] = useState<StatItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch<{ data: PublicStats }>('/public/stats');
        if (cancelled || !res?.data) return;
        setItems([
          {
            value: res.data.patientsAttendedDisplay || LANDING_STATS.patientsServed,
            label: LANDING_STATS.patientsLabel,
          },
          {
            value:
              res.data.professionalsActiveDisplay ||
              res.data.professionalsRegisteredDisplay ||
              LANDING_STATS.professionals,
            label: LANDING_STATS.professionalsLabel,
          },
          { value: LANDING_STATS.rating, label: LANDING_STATS.ratingLabel },
          { value: LANDING_STATS.avgArrival, label: LANDING_STATS.avgArrivalLabel },
        ]);
      } catch {
        // Mantener valores de respaldo si la API no responde
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={`border-y border-[#E5EAF0] bg-white ${className}`} aria-label="Indicadores">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[28px] font-bold tracking-tight text-[#185FA5] sm:text-[32px]">{item.value}</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
