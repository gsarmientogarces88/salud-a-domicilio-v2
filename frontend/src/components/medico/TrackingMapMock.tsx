'use client';

import { useEffect, useState } from 'react';

interface TrackingMapMockProps {
  patientAddress: string;
}

export default function TrackingMapMock({ patientAddress }: TrackingMapMockProps) {
  const [doctorPos, setDoctorPos] = useState({ x: 15, y: 75 });

  useEffect(() => {
    const interval = setInterval(() => {
      setDoctorPos((p) => ({
        x: Math.min(p.x + 2, 55),
        y: Math.max(p.y - 1.5, 45),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-64 overflow-hidden rounded-xl bg-gray-100">
      {/* Fondo de mapa simulado */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Calles simuladas */}
        <path d="M0 20 L100 20" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M0 40 L100 40" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M0 60 L100 60" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M0 80 L100 80" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M20 0 L20 100" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M50 0 L50 100" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
        <path d="M80 0 L80 100" stroke="#94a3b8" strokeWidth="0.5" fill="none" />

        {/* Ruta (línea amarilla) */}
        <path
          d={`M ${doctorPos.x} ${doctorPos.y} Q 30 60 55 45`}
          stroke="#eab308"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="2 2"
        />

        {/* Pin casa paciente */}
        <g transform="translate(55, 45)">
          <circle r="4" fill="#0ea5e9" />
          <path d="M-5 5 L0 0 L5 5 Z" fill="#0ea5e9" />
        </g>

        {/* Ícono médico en movimiento (auto/coche) */}
        <g transform={`translate(${doctorPos.x}, ${doctorPos.y})`}>
          <rect x="-5" y="-3" width="10" height="6" rx="1" fill="#3b82f6" />
          <circle cx="-2" cy="4" r="1.2" fill="#1e40af" />
          <circle cx="2" cy="4" r="1.2" fill="#1e40af" />
        </g>

        {/* Etiqueta 15 min */}
        <g transform="translate(35, 52)">
          <rect x="-8" y="-4" width="16" height="8" rx="2" fill="green" fillOpacity="0.9" />
          <text x="0" y="2" textAnchor="middle" fill="white" fontSize="4">
            15 min
          </text>
        </g>
      </svg>

      {/* Overlay con info */}
      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs font-medium shadow">
        📍 {patientAddress}
      </div>
    </div>
  );
}
