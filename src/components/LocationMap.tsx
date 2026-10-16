import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
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

const MAP_TILE_URL = '/api/map-tiles?z={z}&x={x}&y={y}';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>';

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

  return (
    <div className="relative">
      {isLowAccuracy && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-300">
            ⚠️ La ubicación puede no ser exacta (precisión: {Math.round(accuracy)}m).
            Puedes ajustar arrastrando el marcador o tocando el mapa.
          </p>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-line">
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          style={{ height: '300px', width: '100%' }}
          ref={mapRef}
          className="bg-[#1a1a1a]"
        >
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} maxZoom={22} maxNativeZoom={18} />
          {accuracy != null && accuracy > 0 && accuracy < 5000 && (
            <Circle
              center={markerPosition}
              radius={accuracy}
              pathOptions={{
                color: '#ffa90a',
                fillColor: '#ffa90a',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
          )}
          <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={{ dragend: handleMarkerDragEnd }}
          />
          <MapEvents onLocationChange={handleMapClick} />
        </MapContainer>
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
