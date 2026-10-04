import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants, lightboxImageVariants } from '../lib/motion';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PhotoData } from '../services/photos';
import { IconX } from '../ui';
import { useScrollLock } from '../hooks/useScrollLock';

interface PhotoHistoryProps {
  photos: PhotoData[];
  onDeletePhoto: (photoId: string) => void;
}

interface DateGroup {
  key: string;
  label: string;
  photos: PhotoData[];
}

function groupByDate(photos: PhotoData[]): DateGroup[] {
  const map = new Map<string, PhotoData[]>();
  for (const p of photos) {
    const d = new Date(p.timestamp);
    const key = format(d, 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const groups: DateGroup[] = [];
  for (const [key, groupPhotos] of map) {
    const d = parseISO(key);
    let label: string;
    if (isToday(d)) {
      label = `HOY · ${groupPhotos.length} foto${groupPhotos.length !== 1 ? 's' : ''}`;
    } else if (isYesterday(d)) {
      label = `AYER · ${groupPhotos.length} foto${groupPhotos.length !== 1 ? 's' : ''}`;
    } else {
      const dayName = format(d, 'EEEE', { locale: es }).toUpperCase();
      const dateStr = format(d, 'd MMM yyyy', { locale: es }).toUpperCase();
      label = `${dayName}, ${dateStr} · ${groupPhotos.length} foto${groupPhotos.length !== 1 ? 's' : ''}`;
    }
    groups.push({ key, label, photos: groupPhotos.sort((a, b) => b.timestamp - a.timestamp) });
  }

  return groups.sort((a, b) => b.key.localeCompare(a.key));
}

export default function PhotoHistory({ photos, onDeletePhoto }: PhotoHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lightboxGroup, setLightboxGroup] = useState<DateGroup | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useScrollLock(!!lightboxGroup);

  const groups = useMemo(() => groupByDate(photos), [photos]);

  const currentPhoto = lightboxGroup?.photos[lightboxIndex];

  const handleOpenLightbox = (group: DateGroup, index: number) => {
    setLightboxGroup(group);
    setLightboxIndex(index);
  };

  const handleNext = () => {
    if (!lightboxGroup) return;
    setLightboxIndex((i) => (i + 1) % lightboxGroup.photos.length);
  };

  const handlePrev = () => {
    if (!lightboxGroup) return;
    setLightboxIndex((i) => (i - 1 + lightboxGroup.photos.length) % lightboxGroup.photos.length);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    onDeletePhoto(confirmDeleteId);
    setConfirmDeleteId(null);

    if (lightboxGroup) {
      const remaining = lightboxGroup.photos.filter((p) => p.id !== confirmDeleteId);
      if (remaining.length === 0) {
        setLightboxGroup(null);
      } else {
        const newIdx = Math.min(lightboxIndex, remaining.length - 1);
        setLightboxGroup({ ...lightboxGroup, photos: remaining });
        setLightboxIndex(newIdx);
      }
    }
  };

  const formatPhotoDateTime = (ts: number) => {
    const d = new Date(ts);
    return format(d, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  return (
    <div className="space-y-3">
      {/* Botón Ver historial */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-honey/30 bg-honey/5 px-3 py-2.5 text-sm font-semibold text-honey hover:bg-honey/10 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span>📅</span>
        Ver historial de fotos
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Panel de historial agrupado */}
      <div className={`accordion-grid ${isOpen ? 'open' : ''}`}>
        {isOpen && (
          <div>
            {groups.length === 0 ? (
              <div className="rounded-lg border border-line bg-ink/30 p-6 text-center">
                <p className="text-sm text-husk">Sin fotos aún</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.key}>
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-husk">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {group.photos.map((photo, idx) => (
                        <motion.div
                          key={photo.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                          onClick={() => handleOpenLightbox(group, idx)}
                        >
                          <img
                            src={photo.data}
                            alt="Foto histórica"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-[9px] font-mono">
                              {format(new Date(photo.timestamp), 'HH:mm')}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxGroup && currentPhoto && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center touch-none"
            onClick={() => setLightboxGroup(null)}
          >
            {/* Barra superior */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
              <p className="text-white/80 text-xs font-mono">
                {formatPhotoDateTime(currentPhoto.timestamp)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(currentPhoto.id);
                  }}
                  className="w-10 h-10 bg-coral/20 hover:bg-coral/40 rounded-full flex items-center justify-center text-coral transition-colors"
                  title="Eliminar foto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxGroup(null);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navegación izquierda */}
            {lightboxGroup.photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Imagen */}
            <motion.img
              key={currentPhoto.id}
              variants={lightboxImageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              src={currentPhoto.data}
              alt="Foto ampliada"
              className="max-w-[90%] max-h-[80%] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navegación derecha */}
            {lightboxGroup.photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Barra inferior: contador */}
            {lightboxGroup.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-mono">
                {lightboxIndex + 1} / {lightboxGroup.photos.length}
              </div>
            )}

            {/* Confirmación de eliminación */}
            <AnimatePresence>
              {confirmDeleteId && (
                <motion.div
                  variants={backdropVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-4 touch-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(null);
                  }}
                >
                  <motion.div
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="card max-w-sm w-full p-5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-coral/20">
                      <svg className="h-6 w-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <h4 className="font-display text-lg font-bold text-cream mb-1">Eliminar foto</h4>
                    <p className="text-sm text-husk mb-4">¿Eliminar esta foto? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-cream bg-coral rounded-lg hover:bg-coral/90 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
