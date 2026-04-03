'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const navLinkBase =
    'rounded-full px-3 py-2 text-center text-sm text-gray-700 transition-all duration-200 hover:bg-sky-50 md:py-1';

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          onClick={closeMenu}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-2xl">
            🏥
          </div>
          <span className="truncate text-base font-semibold text-sky-800">
            Salud a Domicilio
          </span>
        </Link>

        <nav
          className="hidden items-center gap-3 text-sm md:flex"
          aria-label="Navegación principal"
        >
          <span className="hidden shrink-0 text-gray-600 md:inline">¿Eres nuevo?</span>
          <Link
            href="/auth/login"
            className="rounded-full px-3 py-1 text-gray-700 transition-all duration-200 hover:bg-sky-50"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 font-medium text-sky-700 transition-all duration-200 hover:bg-sky-100"
          >
            Registrarse
          </Link>
          <Link
            href="/auth/laboratorio/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 font-medium text-sky-800 shadow-sm transition-all duration-200 hover:border-sky-300 hover:bg-sky-100"
          >
            <span className="text-base leading-none" aria-hidden>
              🧪
            </span>
            Portal Laboratorio
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sky-800 transition-all duration-200 hover:bg-sky-50 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-nav"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="landing-mobile-nav"
          className="mt-4 flex flex-col gap-1 border-t border-sky-100 pt-4 md:hidden"
          aria-label="Navegación móvil"
        >
          <span className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            ¿Eres nuevo?
          </span>
          <Link href="/auth/login" className={navLinkBase} onClick={closeMenu}>
            Iniciar Sesión
          </Link>
          <Link href="/auth/register" className={navLinkBase} onClick={closeMenu}>
            Registrarse
          </Link>
          <Link
            href="/auth/laboratorio/login"
            className="mx-1 inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-800 transition-all duration-200 hover:bg-sky-100"
            onClick={closeMenu}
          >
            <span className="text-base leading-none" aria-hidden>
              🧪
            </span>
            Portal Laboratorio
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
