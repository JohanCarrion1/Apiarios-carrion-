import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../services/geolocation';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MAPBOX_TOKEN = String(
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_MAPBOX_ACCESS_TOKEN || '',
).trim();

const MAPBOX_SATELLITE_URL =
  'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=' +
  encodeURIComponent(MAPBOX_TOKEN);

const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  accuracy?: number;
}

function MapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
}

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  accuracy,
}: LocationMapProps) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([latitude, longitude]);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setMarkerPosition([latitude, longitude]);
  }, [latitude, longitude]);

  const handleMarkerDragEnd = async (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    const newLat = position.lat;
    const newLng = position.lng;

    setMarkerPosition([newLat, newLng]);

    setReverseGeocoding(true);
    try {
      const address = await reverseGeocode(newLat, newLng);
      onLocationChange(newLat, newLng, address);
    } catch {
      onLocationChange(newLat, newLng);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);

    setReverseGeocoding(true);
    try {
      const address = await reverseGeocode(lat, lng);
      onLocationChange(lat, lng, address);
    } catch {
      onLocationChange(lat, lng);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const isLowAccuracy = accuracy && accuracy > 100;
  const hasToken = MAPBOX_TOKEN.length > 0;

  return (
    <div className="relative">
      {isLowAccuracy && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-300">
            ⚠️ La ubicación puede no ser exacta (precisión: {Math.round(accuracy)}m).
            Puedes ajustar la ubicación arrastrando el marcador o haciendo clic en el mapa.
          </p>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-line">
        {!hasToken ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 bg-ink px-4 text-center">
            <p className="text-sm text-coral">Falta VITE_MAPBOX_ACCESS_TOKEN para el mapa satélite.</p>
          </div>
        ) : (
          <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{ height: '300px', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution={MAPBOX_ATTRIBUTION}
              url={MAPBOX_SATELLITE_URL}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={22}
            />
            <Marker
              position={markerPosition}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            />
            <MapEvents onLocationChange={handleMapClick} />
          </MapContainer>
        )}
      </div>

      {reverseGeocoding && (
        <div className="mt-2 text-center">
          <p className="text-sm text-husk">🔄 Obteniendo dirección...</p>
        </div>
      )}

      <div className="mt-3 text-xs text-husk">
        <p>💡 Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta</p>
      </div>
    </div>
  );
}
