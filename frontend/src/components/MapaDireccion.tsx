'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type LatLng = { lat: number; lng: number };

interface MapaDireccionProps {
  position: LatLng | null;
  debug?: {
    direccionExacta?: string;
    comuna?: string;
    provincia?: string;
    region?: string;
  };
  onChangeCoords: (coords: LatLng | null) => void;
}

const DEFAULT_CENTER: LatLng = { lat: -33.4489, lng: -70.6693 }; // Santiago

export default function MapaDireccion({
  position,
  debug,
  onChangeCoords,
}: MapaDireccionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeCoordsRef = useRef(onChangeCoords);
  const [error, setError] = useState<string | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    onChangeCoordsRef.current = onChangeCoords;
  }, [onChangeCoords]);

  if (process.env.NODE_ENV === 'development') {
    // Depuración: mostrar si el token está disponible (solo en dev, sin exponerlo completo)
    // eslint-disable-next-line no-console
    console.log('Mapbox token presente:', Boolean(token));
  }

  // Inicializar mapa una sola vez
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if (!token) {
      setError('Falta configurar el token de Mapbox.');
      return;
    }

    mapboxgl.accessToken = token;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: 12,
      });

      mapRef.current = map;

      const marker = new mapboxgl.Marker({ draggable: true })
        .setLngLat([DEFAULT_CENTER.lng, DEFAULT_CENTER.lat])
        .addTo(map);

      markerRef.current = marker;

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onChangeCoordsRef.current({ lat: lngLat.lat, lng: lngLat.lng });
      });
    } catch (e) {
      console.error('Error inicializando Mapbox', e);
      setError('No se pudo cargar el mapa.');
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token]);

  // Centrar mapa / mover marker solo cuando cambia `position`
  useEffect(() => {
    if (!position) return;
    if (!mapRef.current) return;

    const { lat, lng } = position;
    mapRef.current.setCenter([lng, lat]);
    mapRef.current.setZoom(15);

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      return;
    }

    markerRef.current = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(mapRef.current);
    markerRef.current.on('dragend', () => {
      const lngLat = markerRef.current!.getLngLat();
      onChangeCoordsRef.current({ lat: lngLat.lat, lng: lngLat.lng });
    });
  }, [position]);

  if (!token) {
    return (
      <p className="mt-2 text-xs text-amber-700">
        Falta configurar <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> para mostrar el mapa.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">Ubicación referencial del paciente</p>
      {process.env.NODE_ENV === 'development' && debug && (
        <p className="text-[11px] text-gray-400">
          {debug.direccionExacta ? `Dir: ${debug.direccionExacta}` : ''}
          {debug.provincia ? ` · Prov.: ${debug.provincia}` : ''}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm"
      />
    </div>
  );
}

