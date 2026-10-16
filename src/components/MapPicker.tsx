// ============================================================
// MAP PICKER — selector de ubicación (Leaflet + Mapbox Satellite)
// ============================================================
// Tiles satélite: GET /api/map-tiles?z=&x=&y= (proxy con MAPBOX_ACCESS_TOKEN).
// El token no se expone al navegador.
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
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

/** Tiles satélite Mapbox vía proxy del servidor (sin token en el cliente). */
const MAP_TILE_URL = '/api/map-tiles?z={z}&x={x}&y={y}';

const MAP_ATTRIBUTION =
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
  /** Precisión GPS en metros (dibuja círculo alrededor del marcador). */
  accuracyMeters?: number | null;
  /** @deprecated ignorado */
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

function Recenter({
  position,
  zoom,
  forceZoom,
}: {
  position: LatLng | null;
  zoom: number;
  forceZoom?: boolean;
}) {
  const map = useMap();
  const last = useRef('');
  useEffect(() => {
    if (!position) return;
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    if (key === last.current) return;
    last.current = key;
    const targetZoom = forceZoom ? Math.max(zoom, 17) : Math.max(map.getZoom(), zoom);
    map.flyTo([position.lat, position.lng], targetZoom, { duration: 0.8 });
  }, [position, zoom, forceZoom, map]);
  return null;
}

export default function MapPicker({
  coordinates,
  onLocationSelect,
  defaultCenter,
  defaultZoom = 16,
  heightClass = 'h-64 sm:h-80',
  showLocateButton = true,
  helpText = 'Toca el mapa o arrastra el marcador para ajustar la ubicación exacta.',
  className,
  disabled = false,
  accuracyMeters = null,
  scrollWheelZoom = true,
}: MapPickerProps) {
  const [pos, setPos] = useState<LatLng | null>(
    coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null,
  );
  const [accuracy, setAccuracy] = useState<number | null>(accuracyMeters ?? null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [fromGps, setFromGps] = useState(false);

  useEffect(() => {
    if (!coordinates) return;
    setPos((prev) =>
      prev && prev.lat === coordinates.lat && prev.lng === coordinates.lng
        ? prev
        : { lat: coordinates.lat, lng: coordinates.lng },
    );
  }, [coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    if (accuracyMeters != null) setAccuracy(accuracyMeters);
  }, [accuracyMeters]);

  const pick = (c: LatLng, opts?: { accuracy?: number; fromGps?: boolean }) => {
    setPos(c);
    if (opts?.accuracy != null) setAccuracy(opts.accuracy);
    else if (!opts?.fromGps) setAccuracy(null);
    setFromGps(!!opts?.fromGps);
    onLocationSelect(c);
  };

  const handleLocate = async () => {
    try {
      setLocating(true);
      setNote(null);
      const position = await getCurrentPosition();
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      const acc = position.coords.accuracy;
      pick(next, { accuracy: acc, fromGps: true });
      if (acc && acc > 100) {
        setNote(
          `Precisión aproximada (±${Math.round(acc)} m). Arrastra el marcador para afinar.`,
        );
      } else {
        setNote('Ubicación actual marcada en el mapa.');
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

  return (
    <div className={className}>
      <div className={`relative overflow-hidden rounded-xl border border-line ${heightClass}`}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={defaultZoom}
          scrollWheelZoom={scrollWheelZoom}
          className="h-full w-full"
        >
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} maxZoom={22} />
          {pos && accuracy != null && accuracy > 0 && accuracy < 5000 && (
            <Circle
              center={[pos.lat, pos.lng]}
              radius={accuracy}
              pathOptions={{
                color: '#ffa90a',
                fillColor: '#ffa90a',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
          )}
          {pos && (
            <Marker
              position={[pos.lat, pos.lng]}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  pick({ lat: ll.lat, lng: ll.lng });
                  setNote('Marcador ajustado manualmente.');
                },
              }}
            />
          )}
          <ClickHandler
            onPick={
              disabled
                ? () => {}
                : (c) => {
                    pick(c);
                    setNote('Ubicación marcada en el mapa.');
                  }
            }
          />
          <Recenter position={pos} zoom={defaultZoom} forceZoom={fromGps} />
        </MapContainer>

        {pos && (
          <div className="pointer-events-none absolute left-2 top-2 z-[400] rounded-lg bg-ink/85 px-2.5 py-1 font-mono text-[11px] text-cream backdrop-blur">
            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
            {accuracy != null && accuracy > 0 ? ` · ±${Math.round(accuracy)} m` : ''}
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
