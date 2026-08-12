'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LANDING_ROUTES, scrollToLoginSection } from '@/lib/landingConfig';

const SERVICE_LINKS = [
  { href: LANDING_ROUTES.urgency, label: 'Urgencia médica' },
  { href: LANDING_ROUTES.schedule, label: 'Agenda médica' },
  { href: LANDING_ROUTES.exams, label: 'Exámenes a domicilio' },
  { href: LANDING_ROUTES.weightLoss, label: 'Programa baja de peso' },
] as const;

export default function FooterServiceLinks() {
  const { user } = useAuth();

  return (
    <ul className="space-y-2.5">
      {SERVICE_LINKS.map((link) => (
        <li key={link.label}>
          {user ? (
            <Link href={link.href} className="text-[13px] text-sky-100/80 transition hover:text-white">
              {link.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={scrollToLoginSection}
              className="text-left text-[13px] text-sky-100/80 transition hover:text-white"
            >
              {link.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
