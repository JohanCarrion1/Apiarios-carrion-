import { useState } from 'react';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Ajustes</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Ubicación del Apiario */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📍</span>
              Ubicación del Apiario
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="Ej: Huaraz, Áncash"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Latitud</label>
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
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-2">Longitud</label>
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
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="w-full bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                {isGettingLocation ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
              </button>
            </div>
          </div>

          {/* Configuración de Fotos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📷</span>
              Configuración de Fotos
            </h3>
            <div className="space-y-4">
              {/* Toggle de fotos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Permitir fotos en inspecciones</p>
                  <p className="text-white/60 text-sm">Habilitar sistema de fotos</p>
                </div>
                <button
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      photos: { ...localSettings.photos, enabled: !localSettings.photos.enabled },
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localSettings.photos.enabled ? 'bg-amber-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      localSettings.photos.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Calidad de compresión */}
              <div>
                <label className="block text-white/60 text-sm mb-2">
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
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {quality === 'low' ? 'Baja' : quality === 'medium' ? 'Media' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Límite de fotos */}
              <div>
                <label className="block text-white/60 text-sm mb-2">
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
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
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
        <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
