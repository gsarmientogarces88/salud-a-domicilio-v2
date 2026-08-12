'use client';

import Link from 'next/link';
import { useState } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';
import { LANDING_ROUTES, LOGIN_ANCHOR_ID } from '@/lib/landingConfig';

const NAV_LINKS = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#especialidades', label: 'Especialidades' },
  { href: '#como-funciona', label: '¿Cómo funciona?' },
  { href: '#cobertura', label: 'Cobertura' },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5EAF0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo href="/" size={40} priority className="min-w-0" />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-[#4B5563] transition hover:text-[#185FA5]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href={`/#${LOGIN_ANCHOR_ID}`}
            className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F0F7FF] hover:text-[#185FA5]"
          >
            Iniciar sesión
          </Link>
          <Link
            href={LANDING_ROUTES.register}
            className="rounded-lg bg-[#185FA5] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[#185FA5]/25 transition hover:bg-[#144E8A]"
          >
            Registrarse Gratis
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#185FA5] hover:bg-[#F0F7FF] lg:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open ? (
        <nav
          id="landing-mobile-menu"
          className="border-t border-[#E5EAF0] bg-white px-4 py-4 lg:hidden"
          aria-label="Menú móvil"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#374151] hover:bg-[#F0F7FF]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-[#E5EAF0] pt-4">
            <Link
              href={`/#${LOGIN_ANCHOR_ID}`}
              onClick={close}
              className="rounded-lg border border-[#B5D4F4] px-4 py-3 text-center text-sm font-semibold text-[#185FA5]"
            >
              Iniciar sesión
            </Link>
            <Link
              href={LANDING_ROUTES.register}
              onClick={close}
              className="rounded-lg bg-[#185FA5] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Registrarse Gratis
            </Link>
            <Link
              href={LANDING_ROUTES.labPortal}
              onClick={close}
              className="rounded-lg px-4 py-2 text-center text-xs font-medium text-[#6B7280] hover:text-[#185FA5]"
            >
              Portal Laboratorio
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
