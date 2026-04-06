'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type LatLng = { lat: number; lng: number };

interface StaticPreviewMapProps {
  position: LatLng;
  className?: string;
}

export default function StaticPreviewMap({ position, className }: StaticPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [position.lng, position.lat],
      zoom: 14,
      interactive: true,
      scrollZoom: true,
    });
    mapRef.current = map;
    const marker = new mapboxgl.Marker({ draggable: false })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token, position.lat, position.lng]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setCenter([position.lng, position.lat]);
    markerRef.current.setLngLat([position.lng, position.lat]);
  }, [position.lat, position.lng]);

  if (!token) {
    return (
      <p className="text-xs text-amber-700">
        Configura <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> para ver el mapa.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-48 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100'}
    />
  );
}
