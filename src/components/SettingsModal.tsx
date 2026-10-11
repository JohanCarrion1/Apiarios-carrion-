import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';

export interface Settings {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  photos: {
    enabled: boolean;
    quality: 'low' | 'medium' | 'high';
    maxPhotos: 3 | 5 | 10;
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useScrollLock(isOpen);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu navegador');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Obtener nombre de ubicación usando reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const locationName = data.display_name || 'Ubicación actual';
          
          setLocalSettings({
            ...localSettings,
            location: {
              name: locationName,
              latitude,
              longitude,
            },
          });
        } catch (error) {
          setLocalSettings({
            ...localSettings,
            location: {
              name: 'Ubicación actual',
              latitude,
              longitude,
            },
          });
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        alert('Error al obtener la ubicación: ' + error.message);
        setIsGettingLocation(false);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-6">
          <h2 className="font-display text-2xl font-bold text-cream">Ajustes</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {/* Ubicación del Apiario */}
          <div>
            <h3 className="font-display text-lg font-semibold text-cream mb-4 flex items-center gap-2">
              <span>📍</span>
              Ubicación del Apiario
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-husk text-sm mb-2">
                  Nombre de la ubicación
                </label>
                <input
                  type="text"
                  value={localSettings.location.name}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      location: { ...localSettings.location, name: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                  placeholder="Ej: Zona rural, Provincia, Departamento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-husk text-sm mb-2">Latitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={localSettings.location.latitude}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        location: {
                          ...localSettings.location,
                          latitude: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  />
                </div>
                <div>
                  <label className="block text-husk text-sm mb-2">Longitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={localSettings.location.longitude}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        location: {
                          ...localSettings.location,
                          longitude: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  />
                </div>
              </div>
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="w-full rounded-lg border border-honey/30 bg-honey/15 px-4 py-2 text-sm text-honey hover:bg-honey/25 transition-colors disabled:opacity-50"
              >
                {isGettingLocation ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
              </button>
            </div>
          </div>

          {/* Configuración de Fotos */}
          <div>
            <h3 className="font-display text-lg font-semibold text-cream mb-4 flex items-center gap-2">
              <span>📷</span>
              Configuración de Fotos
            </h3>
            <div className="space-y-4">
              {/* Toggle de fotos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cream font-medium">Permitir fotos en inspecciones</p>
                  <p className="text-husk text-sm">Habilitar sistema de fotos</p>
                </div>
                <button
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      photos: { ...localSettings.photos, enabled: !localSettings.photos.enabled },
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localSettings.photos.enabled ? 'bg-honey' : 'bg-line'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                      localSettings.photos.enabled ? 'translate-x-7 bg-ink' : 'translate-x-1 bg-cream'
                    }`}
                  />
                </button>
              </div>

              {/* Calidad de compresión */}
              <div>
                <label className="block text-husk text-sm mb-2">
                  Calidad de compresión
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          photos: { ...localSettings.photos, quality },
                        })
                      }
                      className={`py-2 rounded-lg border transition-colors ${
                        localSettings.photos.quality === quality
                          ? 'border-honey bg-honey/20 text-honey'
                          : 'border-line bg-ink/50 text-husk hover:bg-ink'
                      }`}
                    >
                      {quality === 'low' ? 'Baja' : quality === 'medium' ? 'Media' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Límite de fotos */}
              <div>
                <label className="block text-husk text-sm mb-2">
                  Límite de fotos por inspección
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([3, 5, 10] as const).map((max) => (
                    <button
                      key={max}
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          photos: { ...localSettings.photos, maxPhotos: max },
                        })
                      }
                      className={`py-2 rounded-lg border transition-colors ${
                        localSettings.photos.maxPhotos === max
                          ? 'border-honey bg-honey/20 text-honey'
                          : 'border-line bg-ink/50 text-husk hover:bg-ink'
                      }`}
                    >
                      {max} fotos
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-line p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-3 text-cream text-sm font-medium bg-ink/50 hover:bg-pane2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-honey py-3 text-ink font-semibold hover:bg-honeysoft transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}