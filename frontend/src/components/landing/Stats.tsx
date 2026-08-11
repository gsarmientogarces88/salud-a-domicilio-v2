import { LANDING_STATS } from '@/lib/landingConfig';

const ITEMS = [
  { value: LANDING_STATS.patientsServed, label: LANDING_STATS.patientsLabel },
  { value: LANDING_STATS.professionals, label: LANDING_STATS.professionalsLabel },
  { value: LANDING_STATS.rating, label: LANDING_STATS.ratingLabel },
  { value: LANDING_STATS.avgArrival, label: LANDING_STATS.avgArrivalLabel },
] as const;

type StatsProps = {
  className?: string;
};

export default function Stats({ className = '' }: StatsProps) {
  return (
    <section className={`border-y border-[#E5EAF0] bg-white ${className}`} aria-label="Indicadores">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:gap-4">
        {ITEMS.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[28px] font-bold tracking-tight text-[#185FA5] sm:text-[32px]">{item.value}</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
