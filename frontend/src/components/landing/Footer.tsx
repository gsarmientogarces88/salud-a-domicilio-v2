import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { LANDING_CONTACT, LANDING_ROUTES, whatsappUrl } from '@/lib/landingConfig';

const SERVICE_LINKS = [
  { href: LANDING_ROUTES.urgency, label: 'Urgencia médica' },
  { href: LANDING_ROUTES.schedule, label: 'Agenda médica' },
  { href: LANDING_ROUTES.exams, label: 'Exámenes a domicilio' },
  { href: LANDING_ROUTES.weightLoss, label: 'Programa baja de peso' },
] as const;

const COMPANY_LINKS = [
  { href: '#como-funciona', label: '¿Quiénes somos?' },
  { href: '#como-funciona', label: '¿Cómo funciona?' },
  { href: '#cobertura', label: 'Cobertura' },
  { href: LANDING_ROUTES.labPortal, label: 'Portal laboratorio' },
  { href: LANDING_ROUTES.register, label: 'Trabaja con nosotros' },
] as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#042C53] text-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo href="/" size={40} onDark className="mb-4" />
          <p className="mb-5 max-w-xs text-[13px] leading-relaxed text-sky-100/80">
            Plataforma de salud a domicilio en Gran Concepción. Atención médica profesional, verificada y segura
            donde estés.
          </p>
          <div className="flex gap-2">
            {['ig', 'fb', 'li', 'wa'].map((net) => (
              <a
                key={net}
                href={net === 'wa' ? whatsappUrl() : '#'}
                target={net === 'wa' ? '_blank' : undefined}
                rel={net === 'wa' ? 'noopener noreferrer' : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sky-100 transition hover:bg-white/20"
                aria-label={net}
              >
                <span className="text-[11px] font-bold uppercase">{net}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-[14px] font-semibold">Servicios</h3>
          <ul className="space-y-2.5">
            {SERVICE_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-[13px] text-sky-100/80 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-[14px] font-semibold">Empresa</h3>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-[13px] text-sky-100/80 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-[14px] font-semibold">Contacto</h3>
          <ul className="space-y-3 text-[13px] text-sky-100/80">
            <li>
              <a href={`tel:${LANDING_CONTACT.phoneTel}`} className="hover:text-white">
                {LANDING_CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${LANDING_CONTACT.email}`} className="hover:text-white">
                {LANDING_CONTACT.email}
              </a>
            </li>
            <li>{LANDING_CONTACT.address}</li>
            <li>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/15 px-3 py-1.5 text-[#7DD3B0] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/25"
              >
                WhatsApp disponible
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 px-4 py-4 text-[12px] text-sky-200/70 sm:flex-row sm:items-center sm:px-6">
          <p>© {year} Medicilio. Todos los derechos reservados. Concepción, Chile.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="hover:text-white">
              Términos de uso
            </a>
            <a href="#" className="hover:text-white">
              Política de privacidad
            </a>
            <a href="#" className="hover:text-white">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
