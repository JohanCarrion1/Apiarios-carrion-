import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_COLORS, type Hive, type Inspection, isNucleus } from "../types/hive";
import type { Queen, QueenChange } from '../types/queen';
import type { BreedingLot } from '../types/breeding';
import {
  QUEEN_AGE_LABEL,
  QUEEN_CHANGE_REASON_LABELS,
  QUEEN_ORIGIN_LABELS,
  QUEEN_STATUS_COLORS,
  QUEEN_STATUS_LABELS,
  QUEEN_YEAR_COLORS,
  QUEEN_YEAR_COLOR_LABELS,
  getQueenAlert,
} from '../types/queen';
import { IconCrown, IconPlus, IconNote, IconX } from "../ui";
import PhotoUploader from './PhotoUploader';
import type { PhotoData } from '../services/photos';

interface Props {
  hive: Hive;
  inspections: Inspection[];
  totalHives: number;
  onInspect: (id: string) => void;
  onEdit: (hive: Hive) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onDuplicate?: (hive: Hive) => void;
  onExport?: (hive: Hive) => void;
  onUpdateFotos?: (id: string, fotos: PhotoData[]) => void;
  tags?: string[];
  onToggleTag?: (tag: string) => void;
  queen?: Queen | null;
  queenHistory?: QueenChange[];
  onRegisterQueen?: (hive: Hive) => void;
  onEditQueen?: (queen: Queen) => void;
  onChangeQueen?: (queen: Queen, hive: Hive) => void;
  onMarkQueenLost?: (queen: Queen) => void;
  breedingLots?: BreedingLot[];
  onShowQueenLot?: (loteId: string) => void;
}

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}

export default function HiveDetail({ 
  hive, 
  inspections, 
  totalHives, 
  onInspect, 
  onEdit, 
  onDelete, 
  onShowToast,
  onDuplicate,
  onExport,
  onUpdateFotos,
  tags = [],
  onToggleTag,
  queen,
  queenHistory = [],
  onRegisterQueen,
  onEditQueen,
  onChangeQueen,
  onMarkQueenLost,
  breedingLots = [],
  onShowQueenLot,
}: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!showDeleteModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) setShowDeleteModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteModal, isDeleting]);
  
  const color = STATUS_COLORS[hive.status];
  const history = inspections.slice(0, 3);
  const statusLabel = hive.status === 'sin_reina' ? 'SIN REINA' : hive.status.toUpperCase();
  const nucleus = isNucleus(hive);
  const entityLabel = nucleus ? 'Núcleo' : 'Colmena';
  const entityLower = nucleus ? 'núcleo' : 'colmena';
  const entityArticleMask = nucleus ? 'otro' : 'otra';
  const entityArticleAcc = nucleus ? 'este' : 'esta';

  // Reina
  const queenAlert = queen ? getQueenAlert(queen) : null;
  const queenAgeLabel = queen ? QUEEN_AGE_LABEL(queen) : '';
  const queenChanges = queenHistory
    .filter(h => h.hiveId === hive.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const queenBirthLabel = queen ? format(parseISO(queen.fechaNacimiento), 'd MMM yyyy', { locale: es }) : '';
  const queenLot = queen?.loteId ? breedingLots.find(l => l.id === queen.loteId) : undefined;
  const queenLotLabel = queen?.loteId && queenLot
    ? `Lote ${queen.loteId.slice(-6).toUpperCase()}`
    : '';

  const handleDeleteClick = () => {
    if (totalHives <= 1) {
      onShowToast(`Debe tener al menos un ${entityLower}. Agregue ${entityArticleMask} antes de eliminar este.`, 'error');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      // Simular pequeño delay para mostrar loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onDelete(hive.id);
      onShowToast(`${entityLabel} ${hive.code} eliminada correctamente`, 'success');
      setShowDeleteModal(false);
    } catch (error) {
      onShowToast(`Error al eliminar el ${entityLower}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.aside 
      className="lg:sticky lg:top-28"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.div 
        key={hive.id}
        className="card relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Barra superior de color */}
        <motion.div 
          className="h-2"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ transformOrigin: 'left', background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        />

        <div className="p-6">
          {/* Header con código y estado */}
          <motion.div 
            className="flex items-start justify-between gap-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div>
              <p className="tick-label mb-1">{entityLabel}</p>
              <motion.h3 
                className="font-display text-5xl font-black tracking-tight text-cream"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {hive.code}
              </motion.h3>
              {hive.name && (
                <p className="mt-1 text-sm text-husk italic">{hive.name}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span 
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color, background: color + "20", border: `2px solid ${color}` }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {statusLabel}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                REV. {daysAgo(hive.updatedAt).toUpperCase()}
              </span>
            </div>
          </motion.div>

          {/* Información de reina */}
          {onRegisterQueen ? (
            <motion.div 
              className="mb-4 rounded-xl border border-honey/25 bg-honey/5 p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-husk">
                  <IconCrown className="h-4 w-4 text-honey" />
                  Reina
                </p>
                {queen && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: QUEEN_STATUS_COLORS[queen.estado],
                      background: QUEEN_STATUS_COLORS[queen.estado] + '1c',
                      border: `1px solid ${QUEEN_STATUS_COLORS[queen.estado]}55`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: QUEEN_STATUS_COLORS[queen.estado] }} />
                    {QUEEN_STATUS_LABELS[queen.estado]}
                  </span>
                )}
              </div>

              {queen ? (
                <div className="space-y-3">
                  {/* Datos principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-lg border border-line bg-ink/50 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-0.5">Nacimiento</p>
                      <p className="text-sm font-semibold text-cream">{queenBirthLabel}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-ink/50 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-0.5">Edad actual</p>
                      <p className="text-sm font-semibold text-cream">{queenAgeLabel}</p>
                    </div>
                  </div>

                  {/* Badges: color del año + alerta de edad */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/50 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-husk">
                      <span className="h-3 w-3 rounded-full border-2 border-ink" style={{ background: QUEEN_YEAR_COLORS[queen.colorAño] }} />
                      {QUEEN_YEAR_COLOR_LABELS[queen.colorAño]}
                    </span>
                    {queenAlert && (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${queenAlert.cls}`}>
                        {queenAlert.label}
                      </span>
                    )}
                  </div>

                  {/* Origen */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono uppercase tracking-wider text-husk">Origen</span>
                    {queen.origen === 'lote' && queen.loteId ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-husk">{QUEEN_ORIGIN_LABELS[queen.origen]}</span>
                        <span className="text-cream">·</span>
                        <button
                          onClick={() => onShowQueenLot && queen.loteId && onShowQueenLot(queen.loteId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-honey/40 bg-honey/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-honey hover:bg-honey/20"
                        >
                          {queenLotLabel}
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </span>
                    ) : (
                      <span className="text-cream">{QUEEN_ORIGIN_LABELS[queen.origen]}</span>
                    )}
                  </div>

                  {/* Línea genética */}
                  {queen.lineaGenetica && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-mono uppercase tracking-wider text-husk">Línea genética</span>
                      <span className="text-cream">{queen.lineaGenetica}</span>
                    </div>
                  )}

                  {/* Características */}
                  {queen.caracteristicas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {queen.caracteristicas.map(c => (
                        <span key={c} className="rounded-full border border-line bg-ink/60 px-2 py-0.5 text-[11px] text-husk">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notas */}
                  {queen.notas && (
                    <p className="rounded-lg border border-line bg-ink/50 p-2.5 text-xs italic text-husk">"{queen.notas}"</p>
                  )}

                  {/* Botones de acción */}
                  {queen.estado === 'activa' && (
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        onClick={() => onChangeQueen && onChangeQueen(queen, hive)}
                        className="flex-1 rounded-lg border border-honey/50 bg-honey/10 px-3 py-2 text-xs font-semibold text-honey hover:bg-honey/20"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Registrar cambio de reina
                      </motion.button>
                      <motion.button
                        onClick={() => onMarkQueenLost && onMarkQueenLost(queen)}
                        className="flex-1 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-xs font-semibold text-coral hover:bg-coral/20"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Marcar como perdida
                      </motion.button>
                    </div>
                  )}
                  <motion.button
                    onClick={() => onEditQueen && onEditQueen(queen)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-husk hover:border-honey/50 hover:text-cream"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Editar información
                  </motion.button>

                  {/* Historial de cambios de reina */}
                  {queenChanges.length > 0 && (
                    <div className="border-t border-line pt-3">
                      <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-husk">Historial de cambios</p>
                      <div className="space-y-1.5">
                        {queenChanges.slice(0, 5).map(change => (
                          <div key={change.id} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ background: QUEEN_STATUS_COLORS.cambiada }} />
                            <span className="font-semibold text-cream">
                              {format(parseISO(change.fecha), 'd MMM yyyy', { locale: es })}
                            </span>
                            <span className="text-husk">·</span>
                            <span className="text-husk">{QUEEN_CHANGE_REASON_LABELS[change.razon]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="mb-2 text-sm text-husk">Sin reina registrada</p>
                  <motion.button
                    onClick={() => onRegisterQueen(hive)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-honey px-4 py-2 text-xs font-semibold text-ink hover:bg-honeysoft"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Registrar reina
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            hive.queenYear && (
              <motion.div 
                className="mb-4 flex items-center gap-3 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <IconCrown className="h-5 w-5 text-honey" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-cream">Reina {hive.queenYear}</span>
                  {hive.queenMarkColor && hive.queenMarkColor !== 'sin_marca' && (
                    <>
                      <span className="text-husk">•</span>
                      <span className="flex items-center gap-1.5 text-husk">
                        marcada
                        <span 
                          className="h-3 w-3 rounded-full border-2 border-ink" 
                          style={{ 
                            background: hive.queenMarkColor === 'verde' ? '#7fb069' :
                                        hive.queenMarkColor === 'amarillo' ? '#ffc961' :
                                        hive.queenMarkColor === 'azul' ? '#6fa8dc' :
                                        hive.queenMarkColor === 'rojo' ? '#e4603f' :
                                        hive.queenMarkColor === 'blanco' ? '#e8e4da' : '#666'
                          }} 
                        />
                        {hive.queenMarkColor}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            )
          )}

          {/* Ubicación */}
          {hive.location && (
            <motion.p 
              className="mb-4 text-sm text-husk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              📍 {hive.location}
            </motion.p>
          )}

          {/* Notas */}
          {hive.notes && (
            <motion.div
              className="mb-4 rounded-lg border border-line bg-ink/50 p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Notas</p>
              <p className="text-sm italic leading-relaxed text-husk">"{hive.notes}"</p>
            </motion.div>
          )}

          {/* Historial de inspecciones */}
          {history.length > 0 && (
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="tick-label mb-2">Últimas Inspecciones</p>
              <div className="space-y-2">
                {history.map((i, index) => (
                  <motion.div 
                    key={i.id} 
                    className="flex items-center gap-3 rounded-lg border border-line bg-ink/60 px-3 py-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                      {new Date(i.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    {i.queenSeen && (
                      <span className="text-[10px] text-sage">✓ Reina</span>
                    )}
                    <span className="ml-auto truncate text-xs text-husk">{i.note || 'Sin notas'}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Etiquetas */}
          {onToggleTag && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
            >
              <p className="tick-label mb-2">Etiquetas</p>
              <div className="flex flex-wrap gap-2">
                {['Alta producción', 'Reina nueva', 'Problemas', 'Experimental'].map(tag => {
                  const isActive = tags.includes(tag);
                  return (
                    <motion.button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-honey text-ink'
                          : 'bg-ink/50 text-husk hover:bg-ink/70'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {tag}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Fotos de la colmena */}
          {onUpdateFotos && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.77 }}
            >
              <PhotoUploader
                photos={hive.fotos || []}
                onPhotosChange={(fotos) => onUpdateFotos(hive.id, fotos)}
              />
            </motion.div>
          )}

          {/* Botones de acción */}
          <motion.div 
            className="flex gap-2 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => onEdit(hive)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconNote className="h-3.5 w-3.5" />
              Editar
            </motion.button>
            <motion.button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 rounded-lg border border-coral/30 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/10 transition-colors flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconX className="h-3.5 w-3.5" />
              Eliminar
            </motion.button>
          </motion.div>

          {/* Botones adicionales: Duplicar y Exportar */}
          {(onDuplicate || onExport) && (
            <motion.div
              className="flex gap-2 mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
            >
              {onDuplicate && (
                <motion.button
                  onClick={() => onDuplicate(hive)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicar
                </motion.button>
              )}
              {onExport && (
                <motion.button
                  onClick={() => onExport(hive)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Botón grande de inspección */}
          <motion.button
            onClick={() => onInspect(hive.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_28px_rgba(240,164,28,.4)] active:scale-[0.98]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <IconPlus className="h-5 w-5" />
            Registrar Inspección
          </motion.button>
        </div>
      </motion.div>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {showDeleteModal &&
          createPortal(
            <>
              {/* Overlay / Backdrop */}
              <motion.div
                className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => !isDeleting && setShowDeleteModal(false)}
              />

              {/* Modal */}
              <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                aria-modal="true"
                role="dialog"
                onClick={() => !isDeleting && setShowDeleteModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="card relative max-w-md w-full p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Icono de advertencia */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20"
                >
                  <span className="text-4xl">⚠️</span>
                </motion.div>

                {/* Título */}
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center font-display text-2xl font-bold text-cream mb-2"
                >
                  Eliminar {entityLabel}
                </motion.h3>

                {/* Mensaje */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-6"
                >
                  <p className="text-husk mb-3">
                    ¿Estás seguro de eliminar <strong className="text-cream">{hive.code}</strong>?
                  </p>
                  <div className="rounded-lg border border-coral/30 bg-coral/10 p-3">
                    <p className="text-xs text-coral">
                      <strong>⚠️ Advertencia:</strong> Se eliminarán también todas las inspecciones, cosechas y tareas asociadas a {entityArticleAcc} {entityLower}. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </motion.div>

                {/* Botones */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3"
                >
                  <motion.button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!isDeleting ? { scale: 1.02 } : {}}
                    whileTap={!isDeleting ? { scale: 0.98 } : {}}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-cream bg-coral rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    whileHover={!isDeleting ? { scale: 1.02 } : {}}
                    whileTap={!isDeleting ? { scale: 0.98 } : {}}
                  >
                    {isDeleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full"
                        />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <IconX className="h-4 w-4" />
                        Eliminar
                      </>
                    )}
                  </motion.button>
                </motion.div>
                </motion.div>
              </motion.div>
            </>,
            document.body,
          )}
      </AnimatePresence>
    </motion.aside>
  );
}
