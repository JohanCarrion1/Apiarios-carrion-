import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PhotoData } from '../services/photos';
import { collectInspectionPhotos, inspectionPhotoCount } from '../services/inspectionPhotos';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { IconTrash, IconX } from '../ui';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants, lightboxImageVariants } from '../lib/motion';

export interface InspectionHistoryItem {
  id: string;
  date: string; // ISO
  queenSeen?: boolean | null;
  brood?: number | null;
  honey?: number | null;
  varroa?: number | null;
  calm?: number | null;
  note?: string;
  fotos?: PhotoData[];
  photos?: string[]; // URLs de Firebase Storage
}

interface InspectionHistoryProps {
  inspections: InspectionHistoryItem[];
  loosePhotos?: PhotoData[];
  onDeleteInspection?: (inspectionId: string) => void;
  onDeleteInspectionPhoto?: (inspectionId: string, photoId: string) => void;
  onDeleteLoosePhoto?: (photoId: string) => void;
  onRegisterInspection?: () => void;
}

interface LightboxState {
  photos: PhotoData[];
  index: number;
  onDelete: (photoId: string) => void;
}

const CALM_LABELS: Record<number, string> = { 1: 'Mansa', 2: 'Normal', 3: 'Nerviosa' };

/** Paginación del historial: se muestran las 20 más recientes y el resto
 *  se revela en bloques con "Ver más" (nunca se oculta lo ya mostrado). */
const PAGE_SIZE = 20;

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}

function dateRowLabel(iso: string): string {
  return format(new Date(iso), 'EEE d MMM yyyy', { locale: es }).toUpperCase();
}

function renderMetricLine(i: InspectionHistoryItem): string {
  const parts: string[] = [];
  if (i.brood != null) parts.push(`${i.brood} cría`);
  if (i.honey != null) parts.push(`${i.honey} miel`);
  if (i.varroa != null) parts.push(`varroa ${i.varroa.toFixed(1)}%`);
  if (i.calm != null) parts.push(CALM_LABELS[i.calm]);
  if (i.queenSeen != null) parts.push(i.queenSeen ? '👑 vista' : '👑 no vista');
  return parts.join(' · ');
}

const formatPhotoDateTime = (ts: number) =>
  format(new Date(ts), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

export default function InspectionHistory({
  inspections,
  loosePhotos = [],
  onDeleteInspection,
  onDeleteInspectionPhoto,
  onDeleteLoosePhoto,
  onRegisterInspection,
}: InspectionHistoryProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Inspección completa pendiente de confirmar (las fotos usan confirmDeleteId)
  const [inspectionToDelete, setInspectionToDelete] = useState<InspectionHistoryItem | null>(null);
  // Cuántas inspecciones se muestran (paginación progresiva)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useScrollLock(!!lightbox || !!inspectionToDelete);

  const sorted = useMemo(
    () =>
      inspections
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [inspections]
  );

  // Si se registra o se elimina una inspección, la lista vuelve a las 20 últimas.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [inspections.length]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const remaining = sorted.length - visible.length;
  const canCollapse = visibleCount > PAGE_SIZE;

  const currentPhoto = lightbox?.photos[lightbox.index] ?? null;

  const handleNext = () => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.photos.length });
  };

  const handlePrev = () => {
    if (!lightbox) return;
    setLightbox({
      ...lightbox,
      index: (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length,
    });
  };

  const handleConfirmDeleteInspection = () => {
    if (!inspectionToDelete) return;
    onDeleteInspection?.(inspectionToDelete.id);
    if (openId === inspectionToDelete.id) setOpenId(null);
    setInspectionToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!lightbox || !confirmDeleteId) return;
    lightbox.onDelete(confirmDeleteId);
    const remaining = lightbox.photos.filter((p) => p.id !== confirmDeleteId);
    if (remaining.length === 0) {
      setLightbox(null);
    } else {
      const newIdx = Math.min(lightbox.index, remaining.length - 1);
      setLightbox({ ...lightbox, photos: remaining, index: newIdx });
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-1">
      {/* Encabezado en UNA línea: título + contador + triángulo que rota; cerrado por defecto */}
      <button
        onClick={() => setSectionOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-1 text-left transition-colors hover:text-cream"
      >
        <span className="tick-label text-[11px] truncate">
          Historial de inspecciones ({sorted.length})
          {sorted.length > PAGE_SIZE && ` · mostrando ${visible.length}`}
        </span>
        <span
          className={`inline-flex shrink-0 items-center justify-center text-[12px] leading-none text-husk transition-transform duration-200 ${
            sectionOpen ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>
      </button>

      {sorted.length === 0 ? (
        <p className="text-xs text-husk">
          Sin inspecciones aún ·{' '}
          {onRegisterInspection && (
            <button
              onClick={onRegisterInspection}
              className="font-semibold text-honey transition-colors hover:text-honeysoft hover:underline"
            >
              Registrar primera →
            </button>
          )}
        </p>
      ) : (
        <div className={`accordion-grid ${sectionOpen ? 'open' : ''}`}>
          {sectionOpen && (
            <div>
              {/* Nivel 1: fechas compactas, una en cada línea */}
              <div className="divide-y divide-line/70">
                {visible.map((i) => {
                  const isOpen = openId === i.id;
                  const photos = collectInspectionPhotos(i);
                  const dataLine = renderMetricLine(i);
                  return (
                    <div key={i.id}>
                      {/* div (no button) para poder anidar la caneca sin HTML inválido */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenId(isOpen ? null : i.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenId(isOpen ? null : i.id);
                          }
                        }}
                        className="group/row flex w-full cursor-pointer items-center gap-2.5 px-1 py-[10px] text-left transition-colors hover:bg-ink/40"
                      >
                        <span
                          className={`inline-flex shrink-0 items-center justify-center text-[12px] leading-none text-husk transition-transform duration-200 ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        >
                          ▶
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-mono text-[11px] font-semibold tracking-wide text-cream">
                            {dateRowLabel(i.date)}
                          </span>
                          <span className="text-husk"> · {daysAgo(i.date)}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] font-semibold text-honey">
                          📷 {photos.length}
                        </span>
                        {onDeleteInspection && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectionToDelete(i);
                            }}
                            aria-label={`Eliminar inspección del ${dateRowLabel(i.date)}`}
                            title="Eliminar inspección"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-husk/40 transition-colors hover:bg-coral/20 hover:text-coral focus-visible:text-coral"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Nivel 2: notas + datos + miniaturas de ESA inspección */}
                      <div className={`accordion-grid ${isOpen ? 'open' : ''}`}>
                        {isOpen && (
                          <div>
                            <div className="ml-7 mb-3 space-y-3 rounded-lg border border-line/70 bg-ink/30 p-3">
                              {/* a) Notas / observaciones */}
                              <div>
                                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-husk">
                                  Observaciones
                                </p>
                                {i.note?.trim() ? (
                                  <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-husk">
                                    "{i.note}"
                                  </p>
                                ) : (
                                  <p className="text-xs italic text-husk/60">
                                    Sin observaciones
                                  </p>
                                )}
                              </div>

                              {/* b) Datos en una línea */}
                              {dataLine !== '' && (
                                <p className="text-[11px] font-medium text-cream/90">
                                  {dataLine}
                                </p>
                              )}

                              {/* c) Imágenes de esa inspección */}
                              {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                  {photos.map((photo, idx) => (
                                    <motion.div
                                      key={photo.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                                      onClick={() =>
                                        setLightbox({
                                          photos,
                                          index: idx,
                                          onDelete: (photoId) =>
                                            onDeleteInspectionPhoto?.(i.id, photoId),
                                        })
                                      }
                                    >
                                      <img
                                        src={getOptimizedImageUrl(photo.data)}
                                        alt="Foto de inspección"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      />
                                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
                                      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 text-center font-mono text-[9px] text-white">
                                        {format(new Date(photo.timestamp), 'd MMM · HH:mm', { locale: es })}
                                      </p>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación: "Ver más" (y "Ver menos" si está expandido) */}
              {(remaining > 0 || canCollapse) && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  {remaining > 0 && (
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-honey/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-honey transition-colors hover:bg-honey/10"
                      title={`Mostrar ${Math.min(PAGE_SIZE, remaining)} inspecciones más`}
                    >
                      <span className="text-[9px] leading-none" aria-hidden="true">
                        ▼
                      </span>
                      Ver más inspecciones ({remaining})
                    </button>
                  )}
                  {canCollapse && (
                    <button
                      onClick={() => setVisibleCount(PAGE_SIZE)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-husk transition-colors hover:bg-pane2 hover:text-cream"
                      title="Volver a mostrar sólo las 20 últimas"
                    >
                      <span className="text-[9px] leading-none" aria-hidden="true">
                        ▲
                      </span>
                      Ver menos
                    </button>
                  )}
                </div>
              )}

              {/* Fotos viejas no asociadas a inspecciones */}
              {loosePhotos.length > 0 && (
                <div className="mt-2 border-t border-line/60 pt-2">
                  <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-husk">
                    📷 Fotos sin inspección ({loosePhotos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {loosePhotos.map((photo, idx) => (
                      <motion.div
                        key={photo.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-line/60"
                        onClick={() =>
                          setLightbox({
                            photos: loosePhotos,
                            index: idx,
                            onDelete: onDeleteLoosePhoto || (() => {}),
                          })
                        }
                      >
                        <img
                          src={getOptimizedImageUrl(photo.data)}
                          alt="Foto sin inspección"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
                        <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 text-center font-mono text-[9px] text-white">
                          {format(new Date(photo.timestamp), 'd MMM yyyy', { locale: es })}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmación para eliminar la inspección completa */}
      <AnimatePresence>
        {inspectionToDelete && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4 touch-none"
            onClick={() => setInspectionToDelete(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card w-full max-w-sm p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-coral/20">
                <IconTrash className="h-6 w-6 text-coral" />
              </div>
              <h4 className="mb-1 font-display text-lg font-bold text-cream">Eliminar inspección</h4>
              <p className="mb-1 text-sm text-husk">¿Estás seguro de eliminar esta inspección?</p>
              <p className="mb-1 font-mono text-[11px] text-husk/80">
                {dateRowLabel(inspectionToDelete.date)} · {daysAgo(inspectionToDelete.date)}
              </p>
              <p className="mb-4 text-xs text-husk/80">
                Se borrará el registro
                {inspectionPhotoCount(inspectionToDelete) > 0
                  ? ` y sus ${inspectionPhotoCount(inspectionToDelete)} foto${inspectionPhotoCount(inspectionToDelete) !== 1 ? 's' : ''}`
                  : ''}
                . Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setInspectionToDelete(null)}
                  className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-husk transition-colors hover:bg-pane2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteInspection}
                  className="flex-1 rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-coral/90"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && currentPhoto && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 touch-none"
            onClick={() => setLightbox(null)}
          >
            {/* Barra superior */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
              <p className="font-mono text-xs text-white/80">
                {formatPhotoDateTime(currentPhoto.timestamp)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(currentPhoto.id);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/20 text-coral transition-colors hover:bg-coral/40"
                  title="Eliminar foto"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(null);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navegación izquierda */}
            {lightbox.photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              src={getOptimizedImageUrl(currentPhoto.data)}
              alt="Foto ampliada"
              className="max-h-[80%] max-w-[90%] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navegación derecha */}
            {lightbox.photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Contador */}
            {lightbox.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 font-mono text-sm text-white backdrop-blur-sm">
                {lightbox.index + 1} / {lightbox.photos.length}
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
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 touch-none"
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
                    className="card w-full max-w-sm p-5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-coral/20">
                      <svg className="h-6 w-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <h4 className="mb-1 font-display text-lg font-bold text-cream">Eliminar foto</h4>
                    <p className="mb-4 text-sm text-husk">¿Eliminar esta foto? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-husk transition-colors hover:bg-pane2"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-coral/90"
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