import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { LANDING_ROUTES } from '@/lib/landingConfig';

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#EAF3FB]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <BrandLogo href="/" size={40} />
        <h1 className="mt-8 text-2xl font-semibold text-[#0B3A6E]">
          Política de privacidad de datos médicos
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#4B5563]">
          Medicilio trata tus datos personales y de salud con fines de prestación del servicio,
          coordinación con profesionales y mejora de la experiencia. No vendemos tu información a
          terceros.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
          Puedes solicitar acceso, rectificación o eliminación de tus datos contactándonos a través
          de los canales publicados en la plataforma.
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
