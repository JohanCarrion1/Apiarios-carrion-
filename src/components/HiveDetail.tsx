import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { STATUS_COLORS, HIVE_STATUS_LABELS, type Hive, type Equipamiento, getEquipamiento, type Inspection, type Treatment, isNucleus, hiveHasQueen } from "../types/hive";
import { useScrollLock } from '../hooks/useScrollLock';
import type { Queen, QueenChange } from '../types/queen';
import { QUEEN_CHANGE_REASON_LABELS } from '../types/queen';
import { treatmentStatus, TREATMENT_STATUS_LABELS } from '../utils/treatments';
import type { BreedingLot } from '../types/breeding';
// Queen imports removed — queen info block removed from detail; only badge remains in header
import { IconCrown, IconPlus, IconNote, IconX, IconRefresh, IconLayers } from "../ui";
import InspectionHistory from './InspectionHistory';
import { HiveTechCard } from './TechPanels';
import { collectInspectionPhotos } from '../services/inspectionPhotos';
import type { PhotoData } from '../services/photos';

interface Props {
  hive: Hive;
  inspections: Inspection[];
  totalHives: number;
  onClose?: () => void;
  onInspect: (id: string) => void;
  onEdit: (hive: Hive) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onDuplicate?: (hive: Hive) => void;
  onExport?: (hive: Hive) => void;
  onUpdateFotos?: (id: string, fotos: PhotoData[]) => void;
  onDeleteInspection?: (inspectionId: string) => void;
  onDeleteInspectionPhoto?: (inspectionId: string, photoId: string) => void;
  onUpdateEquipment?: (id: string, equipamiento: Equipamiento) => void;
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
  apiaries?: { id: string; name?: string }[];
  currentApiaryId?: string;
  nextHiveCode?: string;
  onConvertNucleus?: (hive: Hive) => void;
  onTransfer?: (hive: Hive, destApiaryId: string, motivo: string, fecha: string) => boolean;
  closing?: boolean;
  harvests?: { id: string; hiveId: string; date: string; honeyKg: number; type?: string }[];
  treatments?: Treatment[];
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
  onClose,
  onInspect, 
  onEdit, 
  onDelete, 
  onShowToast,
  onDuplicate,
  onExport,
  onUpdateFotos,
  onDeleteInspection,
  onDeleteInspectionPhoto,
  onUpdateEquipment,
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
  apiaries = [],
  currentApiaryId,
  nextHiveCode,
  onConvertNucleus,
  onTransfer,
  closing = false,
  harvests = [],
  treatments = [],
}: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [moveDestApiaryId, setMoveDestApiaryId] = useState('');
  const [moveMotivo, setMoveMotivo] = useState('');
  const [moveFecha, setMoveFecha] = useState(() => new Date().toISOString().slice(0, 10));

  useScrollLock(showDeleteModal || showConvertModal || showMoveModal);

  const lastIdRef = useRef<string | null>(null);
  const prevId = lastIdRef.current;
  const isContentSwap = prevId !== null && prevId !== hive.id;
  lastIdRef.current = hive.id;
  const animClass = closing ? 'detalle-panel closing' : isContentSwap ? 'detalle-panel anim-in-sm' : 'detalle-panel';

  useEffect(() => {
    if (!showDeleteModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) setShowDeleteModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteModal, isDeleting]);

  useEffect(() => {
    if (!showConvertModal && !showMoveModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isConverting || isMoving) return;
      setShowConvertModal(false);
      setShowMoveModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConvertModal, showMoveModal, isConverting, isMoving]);
  
  const color = STATUS_COLORS[hive.status];
  const statusLabel = hive.status === 'sin_reina' ? 'SIN REINA' : hive.status.toUpperCase();
  const nucleus = isNucleus(hive);
  const entityLabel = nucleus ? 'Núcleo' : 'Colmena';
  const entityLower = nucleus ? 'núcleo' : 'colmena';
  const entityArticleMask = nucleus ? 'otro' : 'otra';
  const entityArticleAcc = nucleus ? 'este' : 'esta';

  // Equipamiento (solo colmenas): se lee del estado de la colmena seleccionada.
  const equip = getEquipamiento(hive);
  const equipLabels: { key: 'rejillaExcluidora' | 'alimentador' | 'trampaPolen' | 'mallaPropoleo' | 'colectorApitoxina'; label: string }[] = [
    { key: 'rejillaExcluidora', label: 'Rejilla excluidora' },
    { key: 'alimentador', label: 'Alimentador' },
    { key: 'trampaPolen', label: 'Trampa de polen' },
    { key: 'mallaPropoleo', label: 'Malla de propóleo' },
    { key: 'colectorApitoxina', label: 'Colector de apitoxina' },
  ];
  const saveEquip = (next: Equipamiento) => {
    if (onUpdateEquipment) onUpdateEquipment(hive.id, next);
  };
  const changeAlzas = (delta: number) => {
    const alzas = Math.max(0, Math.min(20, equip.alzas + delta));
    saveEquip({ ...equip, alzas });
  };

  // Línea de tiempo: inspecciones, cosechas, tratamientos y cambios de reina
  const timelineItems = useMemo(() => {
    const items: { id: string; date: string; icon: string; title: string; sub?: string }[] = [];
    inspections.forEach((i) =>
      items.push({
        id: `ti_${i.id}`,
        date: i.date,
        icon: '🔍',
        title: 'Inspección',
        sub: `varroa ${i.varroa}% · cría ${i.brood} · miel ${i.honey}${i.note ? ` · ${i.note}` : ''}`,
      })
    );
    harvests.forEach((h) => {
      if (h.hiveId !== hive.id) return;
      items.push({
        id: `th_${h.id}`,
        date: h.date,
        icon: '🍯',
        title: 'Cosecha',
        sub: `${h.honeyKg} kg${h.type ? ` · ${h.type}` : ''}`,
      });
    });
    treatments.forEach((t) => {
      if (t.hiveId !== hive.id && t.hiveId !== 'apiario') return;
      const status = treatmentStatus(t);
      items.push({
        id: `tt_${t.id}`,
        date: t.startDate,
        icon: '💊',
        title: `Tratamiento: ${t.product}`,
        sub: `${TREATMENT_STATUS_LABELS[status]} · espera ${t.waitingDays} d${t.dose ? ` · ${t.dose}` : ''}`,
      });
    });
    queenHistory.forEach((q) => {
      if (q.hiveId !== hive.id) return;
      items.push({
        id: `tq_${q.id}`,
        date: q.fecha,
        icon: '👑',
        title: QUEEN_CHANGE_REASON_LABELS[q.razon] || 'Cambio de reina',
        sub: q.nota,
      });
    });
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }, [inspections, harvests, treatments, queenHistory, hive.id]);

  // Reina — badge informativo en el encabezado; registro vía botón de acciones
  /* queen detail variables removed */

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

  const availableApiaries = apiaries.filter(a => a.id !== currentApiaryId);
  const currentApiaryName = apiaries.find(a => a.id === currentApiaryId)?.name || 'este apiario';

  const handleOpenMoveModal = () => {
    if (availableApiaries.length === 0) {
      onShowToast('No hay otro apiario disponible para mover esta colmena', 'error');
      return;
    }
    setMoveDestApiaryId(availableApiaries[0].id);
    setMoveMotivo('');
    setMoveFecha(new Date().toISOString().slice(0, 10));
    setShowMoveModal(true);
  };

  const handleConfirmConvert = async () => {
    if (isConverting || !onConvertNucleus) return;
    setIsConverting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onConvertNucleus(hive);
      setShowConvertModal(false);
    } finally {
      setIsConverting(false);
    }
  };

  const handleConfirmMove = async () => {
    if (isMoving || !onTransfer || !moveDestApiaryId) return;
    if (!moveFecha || Number.isNaN(new Date(moveFecha).getTime())) {
      onShowToast('La fecha del traslado no es válida', 'error');
      return;
    }
    setIsMoving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const ok = onTransfer(hive, moveDestApiaryId, moveMotivo, moveFecha);
      if (ok) setShowMoveModal(false);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <aside>
      <div
        key={hive.id}
        className={`card relative overflow-hidden ${animClass}`}
      >
        {/* Barra superior de color */}
        <div
          className="h-[3px]"
          style={{ transformOrigin: 'left', background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        />

        <div className="p-4 space-y-3">
          {/* Header con código y estado */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tick-label">{entityLabel}</p>
              <h3 className="font-display text-2xl font-black tracking-tight text-cream">
                {hive.code}
              </h3>
              {hive.name && (
                <p className="mt-0.5 text-sm text-husk italic">{hive.name}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  aria-label="Cerrar detalle"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink/50 text-husk transition-colors hover:bg-ink/70 hover:text-cream"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span 
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color, background: color + "20", border: `2px solid ${color}` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {statusLabel}
                </span>
                {hiveHasQueen(hive) ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#93cc68] bg-[#93cc6814] border border-[#93cc6835]">
                    👑 Con reina
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#c987c3] bg-[#c987c314] border border-[#c987c335]">
                    ⚠️ Sin reina
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                REV. {daysAgo(hive.updatedAt).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Acciones principales: registrar reina / registrar inspección */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(2,minmax(0,15rem))] lg:justify-start">
            <motion.button
              onClick={() => onRegisterQueen && onRegisterQueen(hive)}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-honey/50 bg-honey/10 px-3 py-2.5 text-sm font-semibold text-honey hover:bg-honey/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconCrown className="h-4 w-4" />
              Registrar reina
            </motion.button>
            <motion.button
              onClick={() => onInspect(hive.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-honey px-3 py-2.5 text-sm font-semibold text-ink shadow-[0_4px_18px_rgba(255,169,10,.35)] transition-all duration-200 hover:bg-honeysoft active:scale-[0.97]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconPlus className="h-4 w-4" />
              Registrar inspección
            </motion.button>
          </div>

          {/* En PC el contenido se reparte en dos columnas: izquierda ficha + equipamiento,
              derecha ubicación, notas, historial y acciones. En móvil sigue apilado. */}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4 lg:space-y-0">
          <div className="space-y-3 lg:space-y-4 lg:rounded-xl lg:border lg:border-line lg:bg-ink/30 lg:p-4">
          {/* Ficha técnica (datos de la última inspección) */}
          <HiveTechCard hive={hive} inspections={inspections} queen={queen} />

          {/* Equipamiento en tiempo real (SOLO colmenas) */}
          {!nucleus && onUpdateEquipment && (
            <div className="space-y-3">
              <p className="tick-label">Equipamiento</p>

              {/* Cantidad de alzas */}
              <div className="flex items-center justify-between rounded-xl border border-line bg-ink/50 p-3">
                <span className="text-xs text-husk">Cantidad de alzas</span>
                <div className="flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    onClick={() => changeAlzas(-1)}
                    aria-label="Quitar alza"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-honey/40 bg-honey/10 font-mono text-lg font-bold text-honey transition-colors hover:bg-honey/25"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    −
                  </motion.button>
                  <span className="w-8 text-center font-mono text-base font-bold text-cream">{equip.alzas}</span>
                  <motion.button
                    type="button"
                    onClick={() => changeAlzas(1)}
                    aria-label="Agregar alza"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-honey/40 bg-honey/10 font-mono text-lg font-bold text-honey transition-colors hover:bg-honey/25"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    +
                  </motion.button>
                </div>
              </div>

              {/* Lista compacta de otros equipos */}
              <div className="space-y-1.5">
                {equipLabels.map((item) => {
                  const active = equip[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between rounded-lg border border-line bg-ink/50 px-3 py-2">
                      <span className="text-xs text-husk">{item.label}</span>
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { v: false, label: 'No' },
                          { v: true, label: 'Sí' },
                        ] as const).map((o) => (
                          <motion.button
                            key={o.label}
                            type="button"
                            onClick={() => saveEquip({ ...equip, [item.key]: o.v })}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 ${
                              active === o.v
                                ? 'bg-honey text-ink'
                                : 'border border-line text-husk hover:border-honey/50 hover:text-cream'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {o.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </div>
          <div className="space-y-3 lg:space-y-4 lg:rounded-xl lg:border lg:border-line lg:bg-ink/30 lg:p-4">
          {/* Ubicación */}
          {hive.location && (
            <p className="text-sm text-husk">
              📍 {hive.location}
            </p>
          )}

          {/* Notas */}
          {hive.notes && (
            <div className="rounded-lg border border-line bg-ink/50 p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Notas</p>
              <p className="text-sm italic leading-relaxed text-husk">"{hive.notes}"</p>
            </div>
          )}

          {/* Etiquetas */}
          {onToggleTag && (
            <div>
              <p className="tick-label mb-1.5">Etiquetas</p>
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
            </div>
          )}

          {/* Historial de inspecciones (sustituye la sección Fotos) */}
          {onInspect && onUpdateFotos && (
            <div>
              <InspectionHistory
                inspections={inspections}
                loosePhotos={(hive.fotos || []).filter(
                  (photo) => !inspections.some((i) => collectInspectionPhotos(i).some((p) => p.id === photo.id))
                )}
                onDeleteInspection={onDeleteInspection}
                onDeleteInspectionPhoto={onDeleteInspectionPhoto}
                onDeleteLoosePhoto={(photoId) =>
                  onUpdateFotos(hive.id, (hive.fotos || []).filter((p) => p.id !== photoId))
                }
                onRegisterInspection={() => onInspect(hive.id)}
              />
            </div>
          )}

          {/* Línea de tiempo: qué ha pasado en esta colmena */}
          {timelineItems.length > 0 && (
            <div>
              <p className="tick-label mb-2">📅 Línea de tiempo</p>
              <div className="space-y-1.5">
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-line bg-ink/50 px-3 py-2"
                  >
                    <span className="w-20 shrink-0 pt-0.5 font-mono text-[10px] text-husk">
                      {item.date.slice(0, 10)}
                    </span>
                    <span className="shrink-0 text-sm">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-cream">{item.title}</p>
                      {item.sub && <p className="line-clamp-2 text-[11px] text-husk">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2">
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
          </div>

          {/* Botones de transferencia: convertir núcleo en colmena y mover a otro apiario */}
          {((nucleus && onConvertNucleus) || onTransfer) && (
            <div className="flex gap-2">
              {nucleus && onConvertNucleus && (
                <motion.button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-honey/40 bg-honey/10 px-3 py-2 text-xs font-semibold text-honey hover:bg-honey/20 transition-colors flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  Convertir en colmena
                </motion.button>
              )}
              {onTransfer && (
                <motion.button
                  onClick={handleOpenMoveModal}
                  disabled={availableApiaries.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  whileHover={availableApiaries.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={availableApiaries.length > 0 ? { scale: 0.98 } : {}}
                >
                  <IconLayers className="h-3.5 w-3.5" />
                  Mover a otro apiario
                </motion.button>
              )}
            </div>
          )}

          {/* Botones adicionales: Duplicar y Exportar */}
          {(onDuplicate || onExport) && (
            <div className="flex gap-2">
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
            </div>
          )}
          </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />

            {/* Modal - centrado encima del backdrop */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icono de advertencia */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20">
                <span className="text-4xl">⚠️</span>
              </div>

              {/* Título */}
              <h3 className="text-center font-display text-2xl font-bold text-cream mb-2">
                Eliminar {entityLabel}
              </h3>

              {/* Mensaje */}
              <div className="text-center mb-6">
                <p className="text-husk mb-3">
                  ¿Estás seguro de eliminar <strong className="text-cream">{hive.code}</strong>?
                </p>
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3">
                  <p className="text-xs text-coral">
                    <strong>⚠️ Advertencia:</strong> Se eliminarán también todas las inspecciones, cosechas y tareas asociadas a {entityArticleAcc} {entityLower}. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Conversión de Núcleo a Colmena */}
      <AnimatePresence>
        {showConvertModal && (
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
              onClick={() => setShowConvertModal(false)}
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
                <IconRefresh className="h-8 w-8 text-honey" />
              </div>

              <h3 className="text-center font-display text-2xl font-bold text-cream mb-2">
                Convertir núcleo en colmena
              </h3>

              <div className="text-center mb-6">
                <p className="text-husk mb-3">
                  ¿Convertir <strong className="text-cream">{hive.code}</strong> en una colmena completa?
                </p>

                {/* Información de lo que se transferirá */}
                <div className="mb-3 rounded-lg border border-honey/25 bg-honey/5 p-3 text-left">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-husk">
                    Se transferirá a la nueva colmena
                  </p>
                  <ul className="space-y-1.5 text-xs text-cream">
                    <li>
                      Se creará la colmena <strong className="text-honey">{nextHiveCode || '—'}</strong>
                    </li>
                    <li>Se transferirán {inspections.length} inspeccione{inspections.length !== 1 ? 's' : ''}</li>
                    <li>Se transferirán {hive.fotos?.length || 0} foto{hive.fotos?.length === 1 ? '' : 's'}</li>
                    {queen ? (
                      <li>Se transferirá la reina registrada</li>
                    ) : (
                      <li className="text-husk">No hay reina registrada. La nueva colmena quedará sin reina.</li>
                    )}
                    <li>
                      Se transferirá el estado: <strong className="text-cream">{HIVE_STATUS_LABELS[hive.status]}</strong>
                    </li>
                  </ul>
                  {inspections.length < 2 && (
                    <p className="mt-2 text-xs text-husk">
                      ⚠️ El núcleo tiene pocas inspecciones registradas ({inspections.length}).
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3">
                  <p className="text-xs text-coral">
                    <strong>⚠️ Advertencia:</strong> El núcleo {hive.code} dejará de existir. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleConfirmConvert}
                  disabled={isConverting}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-ink bg-honey rounded-lg hover:bg-honeysoft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                  whileHover={!isConverting ? { scale: 1.02 } : {}}
                  whileTap={!isConverting ? { scale: 0.98 } : {}}
                >
                  {isConverting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full"
                      />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <IconRefresh className="h-4 w-4" />
                      Convertir
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Transferencia a Otro Apiario */}
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
                Mover {nucleus ? 'núcleo' : 'colmena'} a otro apiario
              </h3>

              <div className="mb-6">
                <p className="text-center text-sm text-husk mb-4">
                  {entityLabel} <strong className="text-cream">{hive.code}</strong> se moverá de{' '}
                  {currentApiaryName} a otro apiario manteniendo su código.
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
                  placeholder="Floración, espacio, manejo, etc."
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
                  className="flex-1 px-4 py-3 text-sm font-semibold text-ink bg-honey rounded-lg hover:bg-honeysoft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
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
