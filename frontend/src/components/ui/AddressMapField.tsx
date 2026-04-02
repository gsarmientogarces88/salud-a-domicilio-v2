'use client';

import { useEffect, useRef, useState } from 'react';

type LatLng = { lat: number; lng: number };

export interface AddressMapFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChangeAddress: (value: string) => void;
  onChangePosition: (value: LatLng | null) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const DEFAULT_CENTER: LatLng = { lat: -33.4489, lng: -70.6693 }; // Santiago

export default function AddressMapField({
  label = 'Dirección exacta *',
  placeholder = 'Ej: Gral. Las Heras 2156, San Miguel',
  value,
  error,
  onChangeAddress,
  onChangePosition,
}: AddressMapFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Carga del script de Google Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.maps && !mapLoaded) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Sin API key solo mostramos el input sin mapa
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [mapLoaded]);

  // Inicializa mapa + autocomplete cuando el script está listo
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !inputRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return;

    const maps = window.google.maps;

    const map = new maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const marker = new maps.Marker({
      map,
      position: DEFAULT_CENTER,
      draggable: true,
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const autocomplete = new maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry'],
      componentRestrictions: { country: ['cl'] },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;
      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      map.panTo({ lat, lng });
      marker.setPosition({ lat, lng });
      map.setZoom(16);

      onChangeAddress(place.formatted_address || value);
      onChangePosition({ lat, lng });
    });

    // Arrastrar marcador manualmente
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      const lat = pos.lat();
      const lng = pos.lng();
      onChangePosition({ lat, lng });
    });
  }, [mapLoaded, onChangeAddress, onChangePosition, value]);

  // Si el usuario modifica manualmente el texto y existe mapa, intentamos geocodificar al perder foco
  const handleBlur = () => {
    if (!window.google?.maps || !mapInstanceRef.current || !markerRef.current || !value.trim()) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: value, componentRestrictions: { country: 'CL' } }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        mapInstanceRef.current.panTo({ lat, lng });
        markerRef.current.setPosition({ lat, lng });
        mapInstanceRef.current.setZoom(16);
        onChangePosition({ lat, lng });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChangeAddress(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-4 py-2 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="mt-1 text-xs text-amber-600">
            Configura <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para activar el mapa.
          </p>
        )}
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div
          ref={mapRef}
          className="h-56 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm sm:h-64"
        />
      )}
    </div>
  );
}

