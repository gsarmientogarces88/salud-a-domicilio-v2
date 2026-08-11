'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
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
  /** Si no hay `position`, pide GPS al montar (por defecto true). */
  autoLocate?: boolean;
  /** Texto encima del mapa. */
  label?: string;
  /** Clases del contenedor del mapa (altura, etc.). */
  mapClassName?: string;
}

const DEFAULT_CENTER: LatLng = { lat: -33.4489, lng: -70.6693 }; // Santiago fallback

function applyPositionToMap(
  map: mapboxgl.Map,
  marker: mapboxgl.Marker | null,
  position: LatLng,
  onChangeCoordsRef: MutableRefObject<(coords: LatLng | null) => void>,
  markerRef: MutableRefObject<mapboxgl.Marker | null>,
) {
  map.setCenter([position.lng, position.lat]);
  map.setZoom(15);

  if (marker) {
    marker.setLngLat([position.lng, position.lat]);
    return;
  }

  const next = new mapboxgl.Marker({ draggable: true })
    .setLngLat([position.lng, position.lat])
    .addTo(map);
  markerRef.current = next;
  next.on('dragend', () => {
    const lngLat = next.getLngLat();
    onChangeCoordsRef.current({ lat: lngLat.lat, lng: lngLat.lng });
  });
}

export default function MapaDireccion({
  position,
  debug,
  onChangeCoords,
  autoLocate = true,
  label = 'Ubicación referencial del paciente',
  mapClassName = 'h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm',
}: MapaDireccionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeCoordsRef = useRef(onChangeCoords);
  const positionRef = useRef(position);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    onChangeCoordsRef.current = onChangeCoords;
  }, [onChangeCoords]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // GPS automático si aún no hay posición
  useEffect(() => {
    if (!autoLocate) return;
    if (position) return;
    if (!navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChangeCoordsRef.current({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, [autoLocate, position]);

  // Inicializar mapa una sola vez
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if (!token) {
      setError('Falta configurar el token de Mapbox.');
      return;
    }

    mapboxgl.accessToken = token;

    const initial = positionRef.current || DEFAULT_CENTER;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initial.lng, initial.lat],
        zoom: positionRef.current ? 15 : 12,
      });

      mapRef.current = map;

      const marker = new mapboxgl.Marker({ draggable: true })
        .setLngLat([initial.lng, initial.lat])
        .addTo(map);

      markerRef.current = marker;

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onChangeCoordsRef.current({ lat: lngLat.lat, lng: lngLat.lng });
      });

      // Si el GPS llegó antes de que el mapa estuviera listo, recentrar al cargar
      map.on('load', () => {
        const current = positionRef.current;
        if (!current || !mapRef.current) return;
        applyPositionToMap(
          mapRef.current,
          markerRef.current,
          current,
          onChangeCoordsRef,
          markerRef,
        );
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

  // Centrar mapa / mover marker cuando cambia `position`
  useEffect(() => {
    if (!position) return;
    if (!mapRef.current) return;

    applyPositionToMap(
      mapRef.current,
      markerRef.current,
      position,
      onChangeCoordsRef,
      markerRef,
    );
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
      {label ? <p className="text-xs font-medium text-gray-600">{label}</p> : null}
      {locating && !position && (
        <p className="text-[11px] text-sky-700">Detectando tu ubicación…</p>
      )}
      {process.env.NODE_ENV === 'development' && debug && (
        <p className="text-[11px] text-gray-400">
          {debug.direccionExacta ? `Dir: ${debug.direccionExacta}` : ''}
          {debug.provincia ? ` · Prov.: ${debug.provincia}` : ''}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div ref={containerRef} className={mapClassName} />
    </div>
  );
}
