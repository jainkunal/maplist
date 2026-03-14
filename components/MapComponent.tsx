'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Place } from '@/store/useMapStore';

// Fix for default marker icon in react-leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapBounds({ places }: { places: Place[] }) {
  const map = useMap();

  useEffect(() => {
    const validPlaces = places.filter(p => p.lat !== 0 && p.lng !== 0);
    if (validPlaces.length > 0) {
      const bounds = L.latLngBounds(validPlaces.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, map]);

  return null;
}

export default function MapComponent({ places }: { places: Place[] }) {
  const validPlaces = places.filter(p => p.lat !== 0 && p.lng !== 0);
  const center: [number, number] = validPlaces.length > 0 
    ? [validPlaces[0].lat, validPlaces[0].lng] 
    : [0, 0];

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={false} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validPlaces.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} icon={icon}>
          <Popup>
            <div className="font-semibold">{place.name}</div>
            {place.notes && <div className="text-sm text-slate-600 mt-1">{place.notes}</div>}
          </Popup>
        </Marker>
      ))}
      <MapBounds places={validPlaces} />
    </MapContainer>
  );
}
