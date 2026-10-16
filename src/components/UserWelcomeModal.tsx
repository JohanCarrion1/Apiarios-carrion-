import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import { IconMapPin } from '../ui';
import { useAuth } from '../context/AuthContext';
import { saveUserApiario, useProfile, type UserApiaryMeta } from '../services/profileService';
import {
  createApiary,
  HIVE_TYPE_OPTIONS,
  DEFAULT_HIVE_TYPE,
  type HiveType,
} from '../services/apiaryService';
import { saveLastActiveApiaryId } from '../utils/storage';
import MapPicker, { type LatLng } from './MapPicker';
import { getCurrentPosition, reverseGeocode } from '../services/geolocation';

interface UserWelcomeModalProps {
  open: boolean;
  /** 'modal' → ventana superpuesta | 'screen' → pantalla completa (bienvenida primer login) */
  variant?: 'modal' | 'screen';
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onClose?: () => void;
  onSaved?: () => void;
}

export default function UserWelcomeModal({
  open,
  variant = 'screen',
  title = 'Bienvenido a Apiarios Carrión',
  subtitle = 'Configura tu apiario para empezar. La app guardará tus datos de forma separada e independiente de los demás usuarios.',
  submitLabel = 'Guardar y continuar',
  onClose,
  onSaved,
}: UserWelcomeModalProps) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.uid);
  const current = profile?.apiario;

  const [nombre, setNombre] = useState(current?.nombre || '');
  const [ubicacion, setUbicacion] = useState(current?.ubicacion || '');
  const [altitud, setAltitud] = useState(current?.altitud || '');
  const [hiveType, setHiveType] = useState<HiveType>(DEFAULT_HIVE_TYPE);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!current) return;
    setNombre((prev) => prev || current.nombre || '');
    setUbicacion((prev) => prev || current.ubicacion || '');
    setAltitud((prev) => prev || current.altitud || '');
  }, [current?.nombre, current?.ubicacion, current?.altitud]);

  useScrollLock(open);

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    if (!nombre.trim()) {
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

    // Coordenadas reales (GPS o mapa) + reverse geocoding con Nominatim
    let coordinates: { lat: number; lng: number; address?: string } | undefined;
    if (coords) {
      let address: string | undefined = ubicacion.trim() || undefined;
      try {
        if (!address) {
          address = await reverseGeocode(coords.lat, coords.lng);
        }
      } catch {
        address = ubicacion.trim() || undefined;
      }
      coordinates = {
        lat: coords.lat,
        lng: coords.lng,
        ...(address ? { address } : {}),
      };
    }

    try {
      setSaving(true);
      const apiaryId = await createApiary(
        user.uid,
        nombre,
        ubicacion.trim(),
        coordinates,
        undefined,
        altitudNum,
        hiveType,
        ubicacion.trim() || undefined,
      );
      saveLastActiveApiaryId(apiaryId, user.uid);
      // Completa el onboarding del perfil (users/{uid}.apiario) para que la
      // pantalla de bienvenida no vuelva a mostrarse.
      const apiario: UserApiaryMeta = {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || (coordinates?.address ?? ''),
        altitud: altitud.trim(),
      };
      await saveUserApiario(user.uid, apiario);
      onSaved?.();
    } catch (err: any) {
      console.error('❌ [WELCOME] Error al guardar el apiario:', err);
      setError(err?.message || 'Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Nombre de tu apiario *
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
          placeholder="Ej: Apiario El Mirador"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(255,169,10,.12)]"
        />
      </div>

      {/* Ubicación: texto libre (opcional) */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Ubicación (texto, opcional)
        </label>
        <input
          type="text"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          placeholder="Ej: Zona rural, Provincia, Departamento"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(255,169,10,.12)]"
        />
      </div>

      {/* Coordenadas reales: GPS + mapa (Nominatim reverse geocode) */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Ubicación en el mapa (opcional)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={async () => {
              try {
                setGpsLoading(true);
                setError('');
                const pos = await getCurrentPosition();
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setMapMode(true);
                // Rellenar dirección con reverse geocoding si el campo de texto está vacío
                try {
                  const address = await reverseGeocode(
                    pos.coords.latitude,
                    pos.coords.longitude,
                  );
                  if (address && !ubicacion.trim()) {
                    setUbicacion(address);
                  }
                } catch {
                  /* reverse geocode opcional */
                }
              } catch (err: any) {
                setError(err?.message || 'No se pudo obtener la ubicación');
              } finally {
                setGpsLoading(false);
              }
            }}
            disabled={gpsLoading || saving}
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
            disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3.5 py-2 text-xs font-bold text-husk transition-colors hover:border-honey/50 hover:text-honey"
          >
            <IconMapPin className="h-3.5 w-3.5" />
            {mapMode ? 'Ocultar mapa' : 'Marcar en mapa'}
          </button>
        </div>
        {(mapMode || coords) && (
          <MapPicker
            coordinates={coords}
            onLocationSelect={async (c) => {
              setCoords(c);
              // Actualizar dirección si el campo de texto está vacío
              try {
                const address = await reverseGeocode(c.lat, c.lng);
                if (address && !ubicacion.trim()) {
                  setUbicacion(address);
                }
              } catch {
                /* reverse geocode opcional */
              }
            }}
            helpText="Toca el mapa o arrastra el marcador para ajustar la ubicación."
            showLocateButton={false}
            heightClass="h-56 sm:h-64"
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

      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Altitud (opcional) — msnm
        </label>
        <input
          type="number"
          value={altitud}
          onChange={(e) => setAltitud(e.target.value)}
          placeholder="Ej: 2500"
          min={-500}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(255,169,10,.12)]"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-sm text-coral"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-honey px-6 py-3.5 text-sm font-bold text-ink transition-all duration-200 hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-60"
        whileHover={{ scale: saving ? 1 : 1.02 }}
        whileTap={{ scale: saving ? 1 : 0.98 }}
      >
        {saving ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-4 w-4 border-2 border-ink border-t-transparent rounded-full"
            />
            Guardando…
          </>
        ) : (
          submitLabel
        )}
      </motion.button>
    </form>
  );

  if (variant === 'screen') {
    return (
      // Raíz anclada al viewport con scroll propio: el botón "Guardar y
      // continuar" queda en el flujo normal, al final del formulario, y el
      // usuario hace scroll natural hasta él. `inset-0` evita el recorte que
      // provocaba `100vh` con la barra del navegador en móvil.
      <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain bg-ink">
        <div className="pointer-events-none fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #ffa90a 0%, transparent 70%)' }} />
        <div className="flex min-h-full items-center justify-center px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card w-full max-w-md p-6 sm:p-8"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-honey/15 border border-honey/30 text-3xl">
                🐝
              </div>
              <h2 className="font-display text-2xl font-black text-cream">{title}</h2>
              <p className="mt-2 text-sm text-husk">{subtitle}</p>
            </div>
            {form}
            {onClose && (
              <button
                onClick={handleClose}
                className="mt-4 w-full text-center text-xs text-husk underline hover:text-cream transition-colors"
              >
                Omitir por ahora
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />
          <motion.div
            className="card relative max-h-[90dvh] w-full max-w-md overflow-y-auto p-8"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold text-cream">{title}</h3>
              <p className="mt-1 text-sm text-husk">{subtitle}</p>
            </div>
            {form}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
