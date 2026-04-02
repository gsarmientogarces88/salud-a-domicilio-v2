'use client';

import { useMemo } from 'react';
import { chileLocations } from '@/data/chileLocations';

export interface LocationSelectorProps {
  region: string;
  city: string;
  commune: string;
  onRegionChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  errors?: { region?: string; city?: string; commune?: string };
  required?: boolean;
}

export default function LocationSelector({
  region,
  city,
  commune,
  onRegionChange,
  onCityChange,
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
  const cities = useMemo(
    () => selectedRegionData?.cities.map((c) => c.city) ?? [],
    [selectedRegionData],
  );

  const selectedCityData = useMemo(
    () => selectedRegionData?.cities.find((c) => c.city === city),
    [selectedRegionData, city],
  );
  const communes = useMemo(
    () => selectedCityData?.communes ?? [],
    [selectedCityData],
  );

  const handleRegionChange = (value: string) => {
    onRegionChange(value);
    onCityChange('');
    onCommuneChange('');
  };

  const handleCityChange = (value: string) => {
    onCityChange(value);
    onCommuneChange('');
  };

  const regionSelectClassName = `${selectClassName} ${errors.region ? 'border-red-500' : ''}`;
  const citySelectClassName = `${selectClassName} ${errors.city ? 'border-red-500' : ''}`;
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
        <label className={labelClassName}>Ciudad {required && '*'}</label>
        <select
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={!region}
          className={`${citySelectClassName} ${!region ? 'cursor-not-allowed bg-gray-100' : ''}`}
        >
          <option value="">Selecciona ciudad</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.city && (
          <p className="mt-1 text-xs text-red-600">{errors.city}</p>
        )}
      </div>
      <div>
        <label className={labelClassName}>Comuna {required && '*'}</label>
        <select
          value={commune}
          onChange={(e) => onCommuneChange(e.target.value)}
          disabled={!city}
          className={`${communeSelectClassName} ${!city ? 'cursor-not-allowed bg-gray-100' : ''}`}
        >
          <option value="">Selecciona comuna</option>
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
