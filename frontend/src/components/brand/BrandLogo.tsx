'use client';

import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  variant?: 'full' | 'icon';
  /** Height in px for the icon square (full logo scales text with it). */
  size?: number;
  className?: string;
  priority?: boolean;
  onDark?: boolean;
};

export default function BrandLogo({
  href = '/',
  variant = 'full',
  size = 42,
  className = '',
  priority = false,
  onDark = false,
}: BrandLogoProps) {
  const icon = (
    <Image
      src="/images/logo-medicilio-icon.png"
      alt="Medicilio Salud a Domicilio"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className="shrink-0 rounded-[10px]"
    />
  );

  const content =
    variant === 'icon' ? (
      icon
    ) : (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <span className="leading-none">
          <span
            className={`block text-[17px] font-semibold tracking-tight ${
              onDark ? 'text-white' : 'text-[#185FA5]'
            }`}
          >
            Medicilio
          </span>
          <span
            className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] ${
              onDark ? 'text-[#7DD3B0]' : 'text-[#3D9B7A]'
            }`}
          >
            Salud a domicilio
          </span>
        </span>
      </span>
    );

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="Medicilio — inicio">
      {content}
    </Link>
  );
}
