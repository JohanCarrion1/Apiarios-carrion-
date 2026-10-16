// ============================================================
// MAP PICKER — selector de ubicación (Leaflet + Mapbox Satellite)
// ============================================================
// Muestra un mapa satélite de Mapbox con un marcador. El usuario puede
// tocar el mapa, arrastrar el marcador o usar su ubicación GPS.
//
// Tiles: Mapbox Satellite Streets (requiere VITE_MAPBOX_ACCESS_TOKEN).
// Reverse geocoding: /api/geocode (MAPBOX_ACCESS_TOKEN en el servidor).
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCurrentPosition } from '../services/geolocation';
import { IconMapPin } from '../ui';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface LatLng {
  lat: number;
  lng: number;
}

/** Token público de Mapbox (pk.*) para las tiles en el navegador. */
const MAPBOX_TOKEN = String(
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_MAPBOX_ACCESS_TOKEN || '',
).trim();

/** Satélite + etiquetas de calles (Mapbox). */
const MAPBOX_SATELLITE_URL =
  'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=' +
  encodeURIComponent(MAPBOX_TOKEN);

const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface MapPickerProps {
  coordinates?: LatLng | null;
  onLocationSelect: (coords: LatLng) => void;
  defaultCenter?: LatLng;
  defaultZoom?: number;
  heightClass?: string;
  showLocateButton?: boolean;
  helpText?: string;
  className?: string;
  disabled?: boolean;
  /** @deprecated Ya solo hay satélite Mapbox; se ignora. */
  basemap?: string;
  scrollWheelZoom?: boolean;
}

const FALLBACK_CENTER: LatLng = { lat: -9.52371, lng: -77.55866 };

function ClickHandler({ onPick }: { onPick: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position, zoom }: { position: LatLng | null; zoom: number }) {
  const map = useMap();
  const last = useRef('');
  useEffect(() => {
    if (!position) return;
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    if (key === last.current) return;
    last.current = key;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), zoom));
  }, [position, zoom, map]);
  return null;
}

export default function MapPicker({
  coordinates,
  onLocationSelect,
  defaultCenter,
  defaultZoom = 15,
  heightClass = 'h-64 sm:h-80',
  showLocateButton = true,
  helpText = 'Toca el mapa o arrastra el marcador para ajustar la ubicación.',
  className,
  disabled = false,
  scrollWheelZoom = true,
}: MapPickerProps) {
  const [pos, setPos] = useState<LatLng | null>(
    coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates) return;
    setPos((prev) =>
      prev && prev.lat === coordinates.lat && prev.lng === coordinates.lng
        ? prev
        : { lat: coordinates.lat, lng: coordinates.lng },
    );
  }, [coordinates?.lat, coordinates?.lng]);

  const pick = (c: LatLng) => {
    setPos(c);
    onLocationSelect(c);
  };

  const handleLocate = async () => {
    try {
      setLocating(true);
      setNote(null);
      const position = await getCurrentPosition();
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      pick(next);
      const accuracy = position.coords.accuracy;
      if (accuracy && accuracy > 100) {
        setNote(
          `Precisión aproximada (±${Math.round(accuracy)} m). Ajusta el marcador si hace falta.`,
        );
      }
    } catch (err) {
      setNote(
        (err as { message?: string } | undefined)?.message ||
          'No se pudo obtener la ubicación.',
      );
    } finally {
      setLocating(false);
    }
  };

  const center = pos ?? defaultCenter ?? FALLBACK_CENTER;
  const hasToken = MAPBOX_TOKEN.length > 0;

  return (
    <div className={className}>
      <div className={`relative overflow-hidden rounded-xl border border-line ${heightClass}`}>
        {!hasToken ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-ink px-4 text-center">
            <p className="text-sm text-coral">Falta el token de Mapbox para el mapa satélite.</p>
            <p className="text-xs text-husk">
              Configura <code className="text-honey">VITE_MAPBOX_ACCESS_TOKEN</code> en Vercel y
              vuelve a desplegar.
            </p>
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={defaultZoom}
            scrollWheelZoom={scrollWheelZoom}
            className="h-full w-full"
          >
            <TileLayer
              attribution={MAPBOX_ATTRIBUTION}
              url={MAPBOX_SATELLITE_URL}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={22}
            />
            {pos && (
              <Marker
                position={[pos.lat, pos.lng]}
                draggable={!disabled}
                eventHandlers={{
                  dragend: (e) => {
                    const ll = (e.target as L.Marker).getLatLng();
                    pick({ lat: ll.lat, lng: ll.lng });
                  },
                }}
              />
            )}
            <ClickHandler onPick={disabled ? () => {} : pick} />
            <Recenter position={pos} zoom={defaultZoom} />
          </MapContainer>
        )}

        {pos && hasToken && (
          <div className="pointer-events-none absolute left-2 top-2 z-[400] rounded-lg bg-ink/85 px-2.5 py-1 font-mono text-[11px] text-cream backdrop-blur">
            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {showLocateButton && (
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating || disabled}
            className="flex items-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-3.5 py-2 text-xs font-bold text-honey transition-colors hover:bg-honey/20 disabled:opacity-60"
          >
            <IconMapPin className="h-3.5 w-3.5" />
            {locating ? 'Ubicando…' : 'Usar mi ubicación'}
          </button>
        )}
        <span className="text-xs text-husk">{helpText}</span>
      </div>

      {note && <p className="mt-2 text-xs text-honey/90">{note}</p>}
    </div>
  );
}
