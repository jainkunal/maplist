'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

type LatLng = { lat: number; lng: number };

function FitBounds({ places }: { places: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 13);
    } else if (places.length > 1) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [12, 12] });
    }
  }, [places, map]);
  return null;
}

export default function MiniMap({ places }: { places: LatLng[] }) {
  const valid = places.filter((p) => p.lat !== 0 && p.lng !== 0);
  const center: [number, number] = valid.length > 0 ? [valid[0].lat, valid[0].lng] : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
      doubleClickZoom={false}
      keyboard={false}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {valid.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={5}
          pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 1, weight: 1.5 }}
        />
      ))}
      <FitBounds places={valid} />
    </MapContainer>
  );
}
