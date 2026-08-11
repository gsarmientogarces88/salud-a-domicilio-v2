import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { LANDING_ROUTES } from '@/lib/landingConfig';

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#EAF3FB]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <BrandLogo href="/" size={40} />
        <h1 className="mt-8 text-2xl font-semibold text-[#0B3A6E]">Términos de uso</h1>
        <p className="mt-4 text-sm leading-6 text-[#4B5563]">
          Al crear una cuenta en Medicilio aceptas utilizar la plataforma de forma responsable para
          solicitar o prestar servicios de salud a domicilio. Medicilio no reemplaza servicios de
          emergencia: ante una emergencia grave debes llamar al SAMU 131.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
          Nos reservamos el derecho de suspender cuentas que incumplan estas condiciones o pongan en
          riesgo la seguridad de pacientes o profesionales.
        </p>
        <Link
          href={LANDING_ROUTES.register}
          className="mt-8 inline-block text-sm font-semibold text-[#185FA5] hover:underline"
        >
          Volver al registro
        </Link>
      </div>
    </main>
  );
}
