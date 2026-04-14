'use client';

import { useMemo, useState } from 'react';
import LocationSelector from '@/components/ui/LocationSelector';
import MapaDireccion from '@/components/MapaDireccion';
import { buildChileGeocodeQuery, geocodeChileAddressLine } from '@/lib/mapboxGeocode';

type LatLng = { lat: number; lng: number };

export interface AddressGeolocationFieldProps {
  region: string;
  province: string;
  commune: string;
  address: string;
  coords: LatLng | null;
  onRegionChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onCoordsChange: (value: LatLng | null) => void;
  required?: boolean;
}

export default function AddressGeolocationField({
  region,
  province,
  commune,
  address,
  coords,
  onRegionChange,
  onProvinceChange,
  onCommuneChange,
  onAddressChange,
  onCoordsChange,
  required = true,
}: AddressGeolocationFieldProps) {
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  const norm = (v: string) => v.replace(/\s+/g, ' ').trim();

  const canSearch = useMemo(
    () => !!norm(region) && !!norm(province) && !!norm(commune) && !!norm(address),
    [region, province, commune, address]
  );
  const hasValidCoords = useMemo(() => {
    if (!coords) return false;
    return (
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng) &&
      coords.lat >= -90 &&
      coords.lat <= 90 &&
      coords.lng >= -180 &&
      coords.lng <= 180
    );
  }, [coords]);

  const handleSearchLocation = async () => {
    const street = norm(address);
    const comuna = norm(commune);
    const provincia = norm(province);
    const regionNorm = norm(region);

    if (!regionNorm || !provincia || !comuna || !street) {
      setGeocodeState({
        loading: false,
        error: 'Completa región, provincia, comuna y dirección para buscar ubicación.',
      });
      return;
    }

    setGeocodeState({ loading: true, error: null });
    const fullAddress = buildChileGeocodeQuery({
      streetLine: street,
      commune: comuna,
      province: provincia,
      region: regionNorm,
    });

    const result = await geocodeChileAddressLine(fullAddress);
    if (!result.ok) {
      onCoordsChange(null);
      setGeocodeState({ loading: false, error: result.error });
      return;
    }

    onCoordsChange({ lat: result.lat, lng: result.lng });
    setGeocodeState({ loading: false, error: null });
  };

  return (
    <div className="space-y-4">
      <LocationSelector
        region={region}
        province={province}
        commune={commune}
        onRegionChange={onRegionChange}
        onProvinceChange={onProvinceChange}
        onCommuneChange={onCommuneChange}
        labelClassName="mb-1 block text-sm font-semibold text-gray-800"
        selectClassName="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
        required={required}
      />

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-800">
          Dirección exacta {required && '*'}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Ej: Los Alerces 123, depto 45"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSearchLocation()}
        disabled={geocodeState.loading || !canSearch}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {geocodeState.loading ? 'Buscando ubicación...' : hasValidCoords ? 'Volver a buscar ubicación' : 'Buscar ubicación'}
      </button>

      {geocodeState.error && <p className="text-xs text-amber-700">{geocodeState.error}</p>}

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-800">
          Mapa de ubicación {required && '*'}
        </label>
        {hasValidCoords ? (
          <MapaDireccion
            position={coords}
            onChangeCoords={(nextCoords) => {
              onCoordsChange(nextCoords);
              if (nextCoords) {
                setGeocodeState((prev) => ({ ...prev, error: null }));
              }
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Busca una dirección para visualizar el mapa.
          </p>
        )}
      </div>
    </div>
  );
}
