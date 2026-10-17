import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { IconX, IconTrash, IconEdit, IconHex, IconCrown, IconLayers, IconPlus } from '../ui';
import { useScrollLock } from '../hooks/useScrollLock';
import type { BreedingLot } from '../types/breeding';
import type { PhotoData } from '../services/photos';
import InspectionHistory from './InspectionHistory';
import InspectionPhotoUploader from './InspectionPhotoUploader';
import type { Fecundador, FecundadorQueenState } from '../types/fecundador';
import {
  FECUNDADOR_STATE_LABELS,
  FECUNDADOR_STATE_COLORS,
  FECUNDADOR_STATE_ORDER,
  fecundadorStateIndex,
  nextFecundadorState,
} from '../types/fecundador';

interface FecundadorDetailProps {
  fecundador: Fecundador;
  breedingLots: BreedingLot[];
  nextNucleoCode: string;
  getBreedingLotLabel: (id?: string) => string;
  apiaries?: { id: string; name?: string }[];
  currentApiaryId?: string;
  onClose: () => void;
  onAdvanceState: (id: string, state: FecundadorQueenState) => void;
  onEdit: () => void;
  onRequestPromote: () => void;
  onRequestDelete: () => void;
  onUpdateFotos: (fotos: PhotoData[]) => void;
  photos?: string[];
  onPhotosChange?: (photos: string[]) => void;
  onRegisterInspection: () => void;
  onTransfer?: (fecundador: Fecundador, destApiaryId: string, motivo: string, fecha: string) => boolean;
  onShowBreedingLot: (lotId: string) => void;
  onShowToast?: (title: string, desc?: string) => void;
  closing?: boolean;
}

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: es });
const formatDay = (iso?: string) => (iso ? format(parseISO(iso), 'd MMM yyyy', { locale: es }) : '—');

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}

export default function FecundadorDetail({
  fecundador,
  breedingLots,
  nextNucleoCode,
  getBreedingLotLabel,
  apiaries = [],
  currentApiaryId,
  onClose,
  onAdvanceState,
  onEdit,
  onRequestPromote,
  onRequestDelete,
  onUpdateFotos,
  onPhotosChange,
  photos = [],
  onRegisterInspection,
  onTransfer,
  onShowBreedingLot,
  onShowToast,
  closing = false,
}: FecundadorDetailProps) {
  const next = nextFecundadorState(fecundador.queenState);
  const currentIdx = fecundadorStateIndex(fecundador.queenState);
  const lot = fecundador.breedingLotId ? breedingLots.find(l => l.id === fecundador.breedingLotId) : undefined;

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [moveDestApiaryId, setMoveDestApiaryId] = useState('');
  const [moveMotivo, setMoveMotivo] = useState('');
  const [moveFecha, setMoveFecha] = useState(() => new Date().toISOString().slice(0, 10));

  useScrollLock(showMoveModal);

  const lastIdRef = useRef<string | null>(null);
  const prevId = lastIdRef.current;
  const isContentSwap = prevId !== null && prevId !== fecundador.id;
  lastIdRef.current = fecundador.id;
  const animClass = closing ? 'detalle-panel closing' : isContentSwap ? 'detalle-panel anim-in-sm' : 'detalle-panel';

  const availableApiaries = apiaries.filter(a => a.id !== currentApiaryId);
  const currentApiaryName = apiaries.find(a => a.id === currentApiaryId)?.name || 'este apiario';

  const handleOpenMoveModal = () => {
    if (availableApiaries.length === 0) {
      onShowToast?.('No hay otro apiario disponible para mover este fecundador');
      return;
    }
    setMoveDestApiaryId(availableApiaries[0].id);
    setMoveMotivo('');
    setMoveFecha(new Date().toISOString().slice(0, 10));
    setShowMoveModal(true);
  };

  const handleConfirmMove = async () => {
    if (isMoving || !onTransfer || !moveDestApiaryId) return;
    if (!moveFecha || Number.isNaN(new Date(moveFecha).getTime())) {
      onShowToast?.('La fecha del traslado no es válida', 'error');
      return;
    }
    setIsMoving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const ok = onTransfer(fecundador, moveDestApiaryId, moveMotivo, moveFecha);
      if (ok) {
        setShowMoveModal(false);
        onClose();
      }
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <aside className="mx-auto w-full max-w-[720px]">
      {/* Ancho acotado a 720px y centrado (como en móvil). Antes la tarjeta se quedaba en max-w-lg
          (media pantalla) y dejaba media grilla en negro, rompiendo la
          armonía con la grilla de hexágonos y el historial de inspecciones,
          que sí son fluidos. Equivale al contenedor de HiveDetail. */}
      <div
        key={fecundador.id}
        className={`card relative w-full p-4 overflow-hidden ${animClass}`}
      >
        {/* Encabezado: badge de estado + REV arriba a la derecha */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center hexclip"
              style={{ background: FECUNDADOR_STATE_COLORS[fecundador.queenState] + '33', border: `2px solid ${FECUNDADOR_STATE_COLORS[fecundador.queenState]}` }}
            >
              <IconHex className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-bold text-cream">{fecundador.code}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
                Baby nuc · {fecundador.estado === 'promovido' ? 'promovido a núcleo' : 'activo'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
              <IconX className="w-4 h-4 text-cream" />
            </button>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ color: FECUNDADOR_STATE_COLORS[fecundador.queenState], background: FECUNDADOR_STATE_COLORS[fecundador.queenState] + '20', border: `2px solid ${FECUNDADOR_STATE_COLORS[fecundador.queenState]}` }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: FECUNDADOR_STATE_COLORS[fecundador.queenState] }} />
              {FECUNDADOR_STATE_LABELS[fecundador.queenState]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
              REV. {daysAgo(fecundador.updatedAt).toUpperCase()}
            </span>
            {fecundador.proximaRevision && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-honey/90">
                PRÓX. REV. {formatDay(fecundador.proximaRevision)}
              </span>
            )}
          </div>
        </div>

        {fecundador.name && <p className="text-sm font-medium text-cream mb-0.5">{fecundador.name}</p>}
        {fecundador.location && <p className="text-xs text-husk mb-1">Ubicación: {fecundador.location}</p>}
        <p className="text-xs text-husk mb-3">Creado el {formatDate(fecundador.createdAt)}</p>

        {/* Acciones principales: registrar reina/celda / registrar inspección */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <motion.button
            onClick={() => next && onAdvanceState(fecundador.id, next)}
            disabled={!next || fecundador.estado !== 'activo'}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-honey/50 bg-honey/10 px-3 py-2.5 text-sm font-semibold text-honey hover:bg-honey/20 disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={next && fecundador.estado === 'activo' ? { scale: 1.02 } : {}}
            whileTap={next && fecundador.estado === 'activo' ? { scale: 0.97 } : {}}
          >
            <IconCrown className="h-4 w-4" />
            Registrar reina/celda
          </motion.button>
          <motion.button
            onClick={onRegisterInspection}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-honey px-3 py-2.5 text-sm font-semibold text-ink shadow-[0_4px_18px_rgba(255,169,10,.35)] transition-all duration-200 hover:bg-honeysoft active:scale-[0.97]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <IconPlus className="h-4 w-4" />
            Registrar inspección
          </motion.button>
        </div>

        {/* A ancho completo el contenido se reparte en 2 columnas desde lg para
            no dejar líneas de texto endless. En móvil/tablet sigue a 1 columna. */}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-x-4">
        {/* Sección REINA: estado y línea de tiempo */}
        <div>
          <p className="tick-label mb-2 flex items-center gap-2">
            <IconCrown className="h-4 w-4 text-honey" />
            Reina
          </p>
          <div className="flex items-center gap-1.5">
            {FECUNDADOR_STATE_ORDER.map((s, idx) => {
              const color = FECUNDADOR_STATE_COLORS[s];
              const done = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={s} className="flex-1">
                  <div
                    className="relative h-2 rounded-full"
                    style={{
                      background: done ? color : 'rgba(255,255,255,0.08)',
                      boxShadow: isCurrent ? `0 0 12px ${color}80` : undefined,
                    }}
                  />
                  <p
                    className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: done ? color : 'var(--color-husk)' }}
                  >
                    {FECUNDADOR_STATE_LABELS[s].split(' ')[0]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Estado actual */}
          <div className="mt-3 rounded-xl border p-3" style={{ borderColor: FECUNDADOR_STATE_COLORS[fecundador.queenState] + '66', background: FECUNDADOR_STATE_COLORS[fecundador.queenState] + '12' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs text-husk">Estado actual</p>
                <p className="font-semibold text-cream text-sm">{FECUNDADOR_STATE_LABELS[fecundador.queenState]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-husk">Fecha</p>
                <p className="font-mono text-sm font-semibold text-cream">{formatDay(fecundador[fecundador.queenState === 'celda_real' ? 'fechaCelda' : fecundador.queenState === 'virgen' ? 'fechaNacimiento' : fecundador.queenState === 'fecundada' ? 'fechaFecundacion' : 'fechaPuesta'])}</p>
              </div>
            </div>
          </div>

          {next && fecundador.estado === 'activo' && (
            <motion.button
              onClick={() => onAdvanceState(fecundador.id, next)}
              className="mt-2 w-full rounded-xl bg-honey py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Avanzar a {FECUNDADOR_STATE_LABELS[next]}
            </motion.button>
          )}
        </div>

        {/* Promoción a núcleo */}
        {fecundador.estado === 'activo' ? (
          fecundador.queenState === 'en_puesta' ? (
            <button
              onClick={onRequestPromote}
              className="w-full rounded-xl bg-sage py-2.5 text-sm font-bold text-ink hover:opacity-90"
            >
              Promover a núcleo (será {nextNucleoCode})
            </button>
          ) : (
            <p className="rounded-xl border border-line bg-ink/50 p-3 text-xs text-husk">
              La reina debe estar en <b className="text-cream">puesta</b> para poder promover este fecundador a núcleo.
            </p>
          )
        ) : fecundador.promotion && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#93cc6866', background: '#93cc6812' }}>
            <p className="tick-label mb-1">Promovido a núcleo</p>
            <p className="font-display text-2xl font-black text-sage">{fecundador.promotion.nucleoCode}</p>
            <p className="text-xs text-husk mt-1">{formatDay(fecundador.promotion.fecha.slice(0, 10))}</p>
          </div>
        )}

        {/* Vínculo con lote de cría */}
        <div>
          <p className="tick-label mb-1.5">Lote de cría</p>
          {lot ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ink/50 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream truncate">{getBreedingLotLabel(fecundador.breedingLotId)}</p>
                <p className="text-[11px] text-husk">{FECUNDADOR_STATE_LABELS[fecundador.queenState]} desde este lote</p>
              </div>
              <button
                onClick={() => onShowBreedingLot(lot.id)}
                className="shrink-0 rounded-lg border border-honey/40 px-3 py-1.5 text-[11px] font-semibold text-honey hover:bg-honey/10"
              >
                Ver lote
              </button>
            </div>
          ) : (
            <p className="rounded-xl border border-line bg-ink/50 p-3 text-xs text-husk">Sin vínculo a lote de cría.</p>
          )}
        </div>

        {/* Notas */}
        {fecundador.notes && (
          <div>
            <p className="tick-label mb-1.5">Notas</p>
            <p className="whitespace-pre-wrap rounded-xl border border-line bg-ink/50 p-3 text-sm text-cream">{fecundador.notes}</p>
          </div>
        )}

        {/* Historial */}
        <div>
          <p className="tick-label mb-1.5">Historial</p>
          <div className="space-y-2">
            {fecundador.historial
              .slice()
              .reverse()
              .map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-xl border border-line bg-ink/50 p-2.5">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background:
                        h.tipo === 'creado'
                          ? '#ffa90a'
                          : h.tipo === 'promovido'
                            ? '#93cc68'
                            : h.tipo === 'eliminado'
                              ? '#f4552b'
                              : h.tipo === 'inspeccion'
                                ? '#6fa8dc'
                                : FECUNDADOR_STATE_COLORS[h.tipo],
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cream">
                      {h.tipo === 'creado'
                        ? 'Fecundador creado'
                        : h.tipo === 'promovido'
                          ? 'Promovido a núcleo'
                          : h.tipo === 'eliminado'
                            ? 'Eliminado'
                            : h.tipo === 'inspeccion'
                              ? 'Inspección'
                              : FECUNDADOR_STATE_LABELS[h.tipo]}
                    </p>
                    {h.descripcion && <p className="text-[11px] text-husk">{h.descripcion}</p>}
                  </div>
                  <p className="shrink-0 font-mono text-[10px] text-husk">{formatDate(h.fecha)}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Fotos del fecundador (Cloudinary, unsigned preset) */}
        {onPhotosChange && (
          <div>
            <p className="tick-label mb-2">Fotos</p>
            <InspectionPhotoUploader
              value={photos}
              onChange={onPhotosChange}
            />
          </div>
        )}

        {/* Historial de inspecciones */}
        <div>
          <InspectionHistory
            inspections={fecundador.historial
              .filter((h) => h.tipo === 'inspeccion')
              .map((h) => ({
                id: h.id,
                date: h.fecha,
                note: h.descripcion?.trim() || '',
                photos: h.photos || [],
              }))}
            loosePhotos={fecundador.fotos || []}
            onDeleteLoosePhoto={(photoId) =>
              onUpdateFotos((fecundador.fotos || []).filter((p) => p.id !== photoId))
            }
            onRegisterInspection={onRegisterInspection}
          />
        </div>        </div>


        {/* Acciones: Editar / Eliminar */}
        <div className="flex gap-2 mb-3">
          <motion.button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-honey/40 bg-honey/10 py-2 text-xs font-semibold text-honey hover:bg-honey/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <IconEdit className="h-3.5 w-3.5" />
            Editar
          </motion.button>
          <motion.button
            onClick={onRequestDelete}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-coral/40 bg-coral/10 py-2 text-xs font-semibold text-coral hover:bg-coral/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <IconTrash className="h-3.5 w-3.5" />
            Eliminar
          </motion.button>
        </div>

        {/* Mover a otro apiario */}
        {onTransfer && (
          <div className="flex gap-2 mb-3">
            <motion.button
              onClick={handleOpenMoveModal}
              disabled={availableApiaries.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={availableApiaries.length > 0 ? { scale: 1.02 } : {}}
              whileTap={availableApiaries.length > 0 ? { scale: 0.98 } : {}}
            >
              <IconLayers className="h-3.5 w-3.5" />
              Mover a otro apiario
            </motion.button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showMoveModal && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
              onClick={() => setShowMoveModal(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-honey/20">
                <IconLayers className="h-8 w-8 text-honey" />
              </div>

              <h3 className="text-center font-display text-2xl font-bold text-cream mb-2">
                Mover fecundador a otro apiario
              </h3>

              <div className="mb-6">
                <p className="text-center text-sm text-husk mb-4">
                  El baby nuc <strong className="text-cream">{fecundador.code}</strong> se moverá de{' '}
                  {currentApiaryName} a otro apiario (se asignará un código nuevo en el destino).
                </p>

                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-husk">Apiario de destino</label>
                <select
                  value={moveDestApiaryId}
                  onChange={(e) => setMoveDestApiaryId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2.5 text-sm text-cream focus:border-honey/70 mb-4"
                >
                  {availableApiaries.map(a => (
                    <option key={a.id} value={a.id}>{a.name || 'Sin nombre'}</option>
                  ))}
                </select>

                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-husk">Motivo del traslado (opcional)</label>
                <input
                  type="text"
                  value={moveMotivo}
                  onChange={(e) => setMoveMotivo(e.target.value)}
                  placeholder="Floración, cría, espacio, etc."
                  className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2.5 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 mb-4"
                />

                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-husk">Fecha del traslado</label>
                <input
                  type="date"
                  value={moveFecha}
                  onChange={(e) => setMoveFecha(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2.5 text-sm text-cream focus:border-honey/70"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleConfirmMove}
                  disabled={!moveDestApiaryId || isMoving}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-ink bg-honey rounded-lg hover:bg-honeysoft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={moveDestApiaryId && !isMoving ? { scale: 1.02 } : {}}
                  whileTap={moveDestApiaryId && !isMoving ? { scale: 0.98 } : {}}
                >
                  {isMoving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full"
                      />
                      Transfiriendo...
                    </>
                  ) : (
                    <>
                      <IconLayers className="h-4 w-4" />
                      Transferir
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}