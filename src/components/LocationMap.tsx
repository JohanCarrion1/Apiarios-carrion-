import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../services/geolocation';

// Fix para el icono por defecto de Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix para los iconos de Leaflet en Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  accuracy?: number;
}

// Componente para manejar eventos del mapa
function MapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
}

export default function LocationMap({ latitude, longitude, onLocationChange, accuracy }: LocationMapProps) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([latitude, longitude]);
  const [isDragging, setIsDragging] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Actualizar posición del marcador cuando cambian las props
  useEffect(() => {
    setMarkerPosition([latitude, longitude]);
  }, [latitude, longitude]);

  // Manejar el arrastre del marcador
  const handleMarkerDragEnd = async (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    const newLat = position.lat;
    const newLng = position.lng;
    
    setMarkerPosition([newLat, newLng]);
    setIsDragging(false);
    
    // Hacer reverse geocoding
    setReverseGeocoding(true);
    try {
      const address = await reverseGeocode(newLat, newLng);
      onLocationChange(newLat, newLng, address);
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      onLocationChange(newLat, newLng);
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Manejar click en el mapa
  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    
    // Hacer reverse geocoding
    setReverseGeocoding(true);
    try {
      const address = await reverseGeocode(lat, lng);
      onLocationChange(lat, lng, address);
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      onLocationChange(lat, lng);
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Determinar si la precisión es mala
  const isLowAccuracy = accuracy && accuracy > 100;

  return (
    <div className="relative">
      {/* Aviso de precisión */}
      {isLowAccuracy && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-300">
            ⚠️ La ubicación puede no ser exacta (precisión: {Math.round(accuracy)}m). 
            Puedes ajustar la ubicación arrastrando el marcador o haciendo clic en el mapa.
          </p>
        </div>
      )}

      {/* Mapa */}
      <div className="rounded-lg overflow-hidden border border-line">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: '300px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={{
              dragstart: () => setIsDragging(true),
              dragend: handleMarkerDragEnd,
            }}
          />
          
          <MapEvents onLocationChange={handleMapClick} />
        </MapContainer>
      </div>

      {/* Indicador de reverse geocoding */}
      {reverseGeocoding && (
        <div className="mt-2 text-center">
          <p className="text-sm text-husk">
            🔄 Obteniendo dirección...
          </p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-3 text-xs text-husk">
        <p>💡 Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta</p>
      </div>
    </div>
  );
}
