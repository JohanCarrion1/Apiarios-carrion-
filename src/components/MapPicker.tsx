// ============================================================
// MAP PICKER — selector de ubicación reutilizable (Leaflet + OSM)
// ============================================================
// Muestra un mapa con un marcador. El usuario puede tocar el mapa,
// arrastrar el marcador o usar su ubicación GPS. Cada cambio llama a
// `onLocationSelect` con las coordenadas elegidas.
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCurrentPosition } from '../services/geolocation';
import { IconMapPin } from '../ui';

// Fix para el icono por defecto de Leaflet en Vite
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

/** Mapas base disponibles. `streets` = OpenStreetMap; `satellite` = Esri. */
export type MapBasemap = 'streets' | 'satellite';

const BASEMAPS: Record<MapBasemap, { url: string; attribution: string }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

interface MapPickerProps {
  /** Coordenadas actuales (controlado). Si es null no hay marcador. */
  coordinates?: LatLng | null;
  /** Se llama al tocar el mapa, arrastrar el marcador o usar el GPS. */
  onLocationSelect: (coords: LatLng) => void;
  /** Centro inicial cuando no hay coordenadas. */
  defaultCenter?: LatLng;
  defaultZoom?: number;
  /** Clase de altura del contenedor del mapa. */
  heightClass?: string;
  /** Mostrar el botón "Usar mi ubicación". */
  showLocateButton?: boolean;
  helpText?: string;
  className?: string;
  disabled?: boolean;
  /** Mapa base: calles (OSM) o satélite (Esri World Imagery). */
  basemap?: MapBasemap;
  /** Zoom con la rueda del ratón. `false` deja que la página haga scroll. */
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
  basemap = 'streets',
  scrollWheelZoom = true,
}: MapPickerProps) {
  const [pos, setPos] = useState<LatLng | null>(
    coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Sincroniza cambios externos (p. ej. botón GPS del padre).
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
        setNote(`Precisión aproximada (±${Math.round(accuracy)} m). Ajusta el marcador si hace falta.`);
      }
    } catch (err) {
      setNote((err as { message?: string } | undefined)?.message || 'No se pudo obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const center = pos ?? defaultCenter ?? FALLBACK_CENTER;
  const tiles = BASEMAPS[basemap];

  return (
    <div className={className}>
      <div className={`relative overflow-hidden rounded-xl border border-line ${heightClass}`}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={defaultZoom}
          scrollWheelZoom={scrollWheelZoom}
          className="h-full w-full"
        >
          <TileLayer key={basemap} attribution={tiles.attribution} url={tiles.url} />
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

        {pos && (
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
