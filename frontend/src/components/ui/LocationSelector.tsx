'use client';

import { useMemo } from 'react';
import { chileLocations } from '@/data/chileLocations';

export interface LocationSelectorProps {
  region: string;
  province: string;
  commune: string;
  onRegionChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  errors?: { region?: string; province?: string; commune?: string };
  required?: boolean;
}

export default function LocationSelector({
  region,
  province,
  commune,
  onRegionChange,
  onProvinceChange,
  onCommuneChange,
  className = '',
  labelClassName = 'mb-1 block text-xs font-semibold text-gray-700',
  selectClassName = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
  errors = {},
  required = true,
}: LocationSelectorProps) {
  const regions = useMemo(() => chileLocations.map((r) => r.region), []);

  const selectedRegionData = useMemo(
    () => chileLocations.find((r) => r.region === region),
    [region],
  );
  const provinceNames = useMemo(
    () => selectedRegionData?.provinces.map((p) => p.province) ?? [],
    [selectedRegionData],
  );

  const selectedProvinceData = useMemo(
    () => selectedRegionData?.provinces.find((p) => p.province === province),
    [selectedRegionData, province],
  );
  const communes = useMemo(
    () => selectedProvinceData?.communes ?? [],
    [selectedProvinceData],
  );

  const handleRegionChange = (value: string) => {
    onRegionChange(value);
    onProvinceChange('');
    onCommuneChange('');
  };

  const handleProvinceChange = (value: string) => {
    onProvinceChange(value);
    onCommuneChange('');
  };

  const regionSelectClassName = `${selectClassName} ${errors.region ? 'border-red-500' : ''}`;
  const provinceSelectClassName = `${selectClassName} ${errors.province ? 'border-red-500' : ''}`;
  const communeSelectClassName = `${selectClassName} ${errors.commune ? 'border-red-500' : ''}`;

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`}>
      <div>
        <label className={labelClassName}>Región {required && '*'}</label>
        <select
          value={region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className={regionSelectClassName}
        >
          <option value="">Selecciona región</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="mt-1 text-xs text-red-600">{errors.region}</p>
        )}
      </div>
      <div>
        <label className={labelClassName}>Provincia {required && '*'}</label>
        <select
          value={province}
          onChange={(e) => handleProvinceChange(e.target.value)}
          disabled={!region}
          className={`${provinceSelectClassName} ${!region ? 'cursor-not-allowed bg-gray-100' : ''}`}
        >
          <option value="">{region ? 'Selecciona provincia' : 'Primero elige región'}</option>
          {provinceNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {errors.province && (
          <p className="mt-1 text-xs text-red-600">{errors.province}</p>
        )}
      </div>
      <div>
        <label className={labelClassName}>Comuna {required && '*'}</label>
        <select
          value={commune}
          onChange={(e) => onCommuneChange(e.target.value)}
          disabled={!province}
          className={`${communeSelectClassName} ${!province ? 'cursor-not-allowed bg-gray-100' : ''}`}
        >
          <option value="">{province ? 'Selecciona comuna' : 'Primero elige provincia'}</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.commune && (
          <p className="mt-1 text-xs text-red-600">{errors.commune}</p>
        )}
      </div>
    </div>
  );
}
