import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import { IconMapPin, IconX } from '../ui';
import { useAuth } from '../context/AuthContext';
import { createApiary, HIVE_TYPE_OPTIONS, DEFAULT_HIVE_TYPE, type HiveType } from '../services/apiaryService';
import { saveLastActiveApiaryId } from '../utils/storage';
import MapPicker, { type LatLng } from './MapPicker';
import { getCurrentPosition, reverseGeocode } from '../services/geolocation';

interface CreateApiaryModalProps {
  open: boolean;
  /** 'modal' → ventana superpuesta (dropdown del dashboard) | 'screen' → pantalla completa (onboarding) */
  variant?: 'modal' | 'screen';
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onClose?: () => void;
  onCreated?: (apiaryId: string) => void;
}

export default function CreateApiaryModal({
  open,
  variant = 'modal',
  title = 'Crear nuevo apiario',
  subtitle = 'Registra un apiario para empezar a gestionar sus colmenas',
  submitLabel = 'Crear apiario',
  onClose,
  onCreated,
}: CreateApiaryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [altitud, setAltitud] = useState('');
  const [hiveType, setHiveType] = useState<HiveType>(DEFAULT_HIVE_TYPE);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useScrollLock(open);

  const resetForm = () => {
    setName('');
    setLocation('');
    setAltitud('');
    setHiveType(DEFAULT_HIVE_TYPE);
    setCoords(null);
    setGpsLoading(false);
    setMapMode(false);
    setError('');
  };

  const handleClose = () => {
    if (creating) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    if (!name.trim()) {
      setError('El nombre del apiario es obligatorio');
      return;
    }

    let altitudNum: number | undefined;
    if (altitud.trim() !== '') {
      altitudNum = Number(altitud);
      if (Number.isNaN(altitudNum)) {
        setError('La altitud debe ser un número en metros');
        return;
      }
    }

    let coordinates: { lat: number; lng: number; address?: string } | undefined;
    if (coords) {
      let address: string | undefined = location.trim() || undefined;
      try {
        if (!address) {
          address = await reverseGeocode(coords.lat, coords.lng);
        }
      } catch (e) {
        address = location.trim() || undefined;
      }
      coordinates = {
        lat: coords.lat,
        lng: coords.lng,
        ...(address ? { address } : {}),
      };
    }

    try {
      setCreating(true);
      const apiaryId = await createApiary(
        user.uid,
        name,
        location,
        coordinates,
        undefined,
        altitudNum,
        hiveType,
      );
      saveLastActiveApiaryId(apiaryId, user.uid);
      resetForm();
      onCreated?.(apiaryId);
    } catch (err: any) {
      console.error('❌ [CREATE APIARY] Error:', err);
      setError(err?.message || 'Error al crear el apiario');
    } finally {
      setCreating(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Nombre del apiario *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej: Apiario El Mirador"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {/* Ubicación */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Ubicación (texto)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: Zona rural, Provincia, Departamento"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {/* Coordenadas / Mapa */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Coordenadas / punto en el mapa
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={async () => {
              try {
                setGpsLoading(true);
                const pos = await getCurrentPosition();
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setMapMode(true);
                setError('');
              } catch (err: any) {
                setError(err?.message || 'No se pudo obtener la ubicación');
              } finally {
                setGpsLoading(false);
              }
            }}
            disabled={gpsLoading}
            className="flex items-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-3.5 py-2 text-xs font-bold text-honey transition-colors hover:bg-honey/20 disabled:opacity-60"
          >
            <IconMapPin className="h-3.5 w-3.5" />
            {gpsLoading ? 'Capturando…' : 'GPS actual'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMapMode((v) => !v);
              setError('');
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3.5 py-2 text-xs font-bold text-husk transition-colors hover:border-honey/50 hover:text-honey"
          >
            <IconMapPin className="h-3.5 w-3.5" />
            {mapMode ? 'Ocultar mapa' : 'Marcar en mapa'}
          </button>
        </div>
        {(mapMode || coords) && (
          <MapPicker
            coordinates={coords}
            onLocationSelect={(c) => setCoords(c)}
            helpText="Toca el mapa o arrastra el marcador para ajustar la ubicación."
          />
        )}
        {coords && (
          <p className="mt-2 font-mono text-xs text-husk">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
        )}
      </div>

      {/* Tipo de colmena */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Tipo de colmena
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HIVE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHiveType(opt.value)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
                hiveType === opt.value
                  ? 'border-honey bg-honey/15'
                  : 'border-line bg-ink hover:border-honey/40'
              }`}
            >
              <span
                className={`font-display text-sm font-bold ${
                  hiveType === opt.value ? 'text-honey' : 'text-cream'
                }`}
              >
                {opt.label}
              </span>
              <span className="text-[11px] text-husk">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Altitud (opcional) */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Altitud (opcional)
        </label>
        <input
          type="number"
          value={altitud}
          onChange={(e) => setAltitud(e.target.value)}
          placeholder="Ej: 2500 (msnm)"
          min={-500}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-lg border border-coral/40 bg-coral/10 text-coral text-sm"
        >
          {error}
        </motion.p>
      )}

      <div className="flex gap-3 pt-1">
        <motion.button
          type="submit"
          disabled={creating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 rounded-xl bg-honey py-3 font-semibold text-ink hover:bg-honeysoft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creando...' : submitLabel}
        </motion.button>
        {variant === 'modal' && onClose && (
          <motion.button
            type="button"
            onClick={handleClose}
            disabled={creating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 rounded-xl border border-line py-3 font-semibold text-husk hover:text-cream"
          >
            Cancelar
          </motion.button>
        )}
      </div>
    </form>
  );

  if (variant === 'screen') {
    return (
      <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain bg-ink">
        <div className="pointer-events-none fixed inset-0">
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
            <defs>
              <pattern id="hex-pattern-onboarding" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#f0a41c" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-pattern-onboarding)" />
          </svg>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f0a41c 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #b97d15 0%, transparent 70%)' }} />
        </div>

        {/* El scroll lo hace la raíz (anclada al viewport); este bloque solo
            centra la tarjeta. El botón "Crear apiario" va en el flujo normal,
            al final del formulario. */}
        <div className="relative z-10 flex min-h-full items-center justify-center px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="card p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="font-display text-3xl font-black tracking-tight text-cream">
                  {title}
                </h1>
                <p className="text-husk mt-2">{subtitle}</p>
              </div>
              {formContent}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm touch-none"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative w-full max-w-md my-8 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            >
              <div className="border-b border-line p-5 flex items-start justify-between">
                <div>
                  <p className="tick-label mb-1.5">Apiarios</p>
                  <h3 className="font-display text-2xl font-black tracking-tight text-cream">{title}</h3>
                </div>
                <motion.button
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={creating}
                >
                  <IconX className="h-5 w-5" />
                </motion.button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">{formContent}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}