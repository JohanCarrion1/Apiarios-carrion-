import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Hive } from '../types/hive';
import type { BreedingLot, BreedingStatus } from '../types/breeding';
import { BREEDING_STATUS_LABELS, BREEDING_STATUS_COLORS, BREEDING_TYPE_LABELS, ACCEPTANCE_BADGES } from '../types/breeding';
import type { Queen } from '../types/queen';
import { IconX } from '../ui';
import PhotoUploader from './PhotoUploader';
import type { PhotoData } from '../services/photos';

interface BreedingDetailProps {
  lot: BreedingLot;
  hives: Hive[];
  nuclei: Hive[];
  breedingLots?: BreedingLot[];
  onClose: () => void;
  onUpdate: (lotId: string, updates: Partial<BreedingLot>) => void;
  onDelete: (lotId: string) => void;
  queens?: Queen[];
  onRequestAssign?: (lotId: string) => void;
}

const STATUS_FLOW: BreedingStatus[] = ['enRealeras', 'enjauladas', 'nacidas', 'fecundando', 'aceptadas'];

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

export default function BreedingDetail({ lot, hives, nuclei, breedingLots = [], onClose, onUpdate, onDelete, queens = [], onRequestAssign }: BreedingDetailProps) {
  const allColonies = [...hives, ...nuclei];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStateMenu, setShowStateMenu] = useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceInput, setAcceptanceInput] = useState('');
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [acceptanceError, setAcceptanceError] = useState('');
  const detailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteConfirm]);

  useEffect(() => {
    if (!showStateMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-state-menu]')) {
        setShowStateMenu(false);
      }
    };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [showStateMenu]);

  const today = new Date();
  const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
  const enclave = parseISO(lot.fechaEnjauladoEstimada);
  const birth = parseISO(lot.fechaNacimientoEstimada);

  const daysUntilEnjaulado = differenceInDays(enclave, today);
  const daysUntilBirth = differenceInDays(birth, today);

  const isOverdueBirth = lot.estado !== 'nacidas' && lot.estado !== 'fecundando' && lot.estado !== 'aceptadas' && lot.estado !== 'perdidas' && today > birth;

  const nextStates = (() => {
    const idx = STATUS_FLOW.indexOf(lot.estado);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
    return STATUS_FLOW.slice(idx + 1);
  })();

  const getColonyLabel = (id: string) => {
    const colony = allColonies.find(c => c.id === id);
    return colony ? `${colony.code}${colony.name ? ` · ${colony.name}` : ''}` : '—';
  };

  const hasAssignedQueen = queens.some(q => q.loteId === lot.id);

  const daysToAcceptance = 3 - daysElapsed;
  const acceptanceRegistered = Boolean(lot.acceptance);
  const shouldRegisterAcceptance = !acceptanceRegistered && daysElapsed >= 3;

  const avgAcceptance = useMemo(() => {
    const withAcceptance = breedingLots.filter(l => l.acceptance);
    if (withAcceptance.length === 0) return null;
    const sum = withAcceptance.reduce((acc, l) => acc + (l.acceptance?.percentage ?? 0), 0);
    return Math.round(sum / withAcceptance.length);
  }, [breedingLots]);

  const acceptanceBadge = lot.acceptance ? ACCEPTANCE_BADGES(lot.acceptance.percentage) : null;

  const handleOpenAcceptanceModal = () => {
    setAcceptanceInput(lot.acceptance ? String(lot.acceptance.acceptedCount) : '');
    setAcceptanceNotes(lot.acceptance?.notes || '');
    setShowAcceptanceModal(true);
  };

  const handleSaveAcceptance = () => {
    const total = lot.cantidadPortacupulas;
    const raw = Number(acceptanceInput);
    if (acceptanceInput.trim() === '' || Number.isNaN(raw)) {
      setAcceptanceError('Ingresa la cantidad aceptada');
      return;
    }
    if (raw < 0) {
      setAcceptanceError('No se permiten números negativos');
      return;
    }
    if (raw > total) {
      setAcceptanceError(`Máximo ${total}`);
      return;
    }
    const parsed = Math.round(raw);
    const percentage = total > 0 ? Math.round((parsed / total) * 100) : 0;
    const acceptance: NonNullable<BreedingLot['acceptance']> = {
      acceptedCount: parsed,
      totalCount: total,
      percentage,
      notes: acceptanceNotes.trim() || undefined,
      registeredAt: new Date().toISOString(),
    };
    if (lot.estado !== 'aceptadas') {
      onUpdate(lot.id, { estado: 'aceptadas', acceptance });
    } else {
      onUpdate(lot.id, { acceptance });
    }
    setAcceptanceError('');
    setShowAcceptanceModal(false);
  };

  const previewCount = (() => {
    const total = lot.cantidadPortacupulas;
    return Math.max(0, Math.min(total, Math.round(Number(acceptanceInput) || 0)));
  })();
  const previewPercentage = (() => {
    const total = lot.cantidadPortacupulas;
    return total > 0 ? Math.round((previewCount / total) * 100) : 0;
  })();
  const previewBadge = ACCEPTANCE_BADGES(previewPercentage);

  const daysRemainingToAcceptance = 3 - daysElapsed;
  const showEarlyWarning = daysRemainingToAcceptance > 0;

  const alertBanner = useMemo(() => {
    if (lot.estado === 'perdidas') return null;
    if (isOverdueBirth) {
      return { color: 'bg-coral/15 border-coral/40 text-coral', text: 'Atrasado — Falta registrar nacimiento' };
    }
    if (daysUntilBirth >= 0 && daysUntilBirth <= 2) {
      return { color: 'bg-sage/15 border-sage/40 text-sage', text: 'Listas para nacer' };
    }
    if (daysUntilEnjaulado === 0) {
      return { color: 'bg-honey/15 border-honey/40 text-honey', text: 'Día de enjaulado' };
    }
    if (daysUntilEnjaulado === 1) {
      return { color: 'bg-orange-400/15 border-orange-400/40 text-orange-400', text: 'Mañana es día de enjaulado' };
    }
    return null;
  }, [lot, daysUntilEnjaulado, daysUntilBirth, isOverdueBirth]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
      style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}
      onClick={onClose}
    >
      <motion.div
        ref={detailScrollRef}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card max-w-2xl w-full p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
                style={{ color: BREEDING_STATUS_COLORS[lot.estado], background: BREEDING_STATUS_COLORS[lot.estado] + '1c', border: `1px solid ${BREEDING_STATUS_COLORS[lot.estado]}55` }}
              >
                {BREEDING_STATUS_LABELS[lot.estado]}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest bg-honey/15 text-honey border border-honey/40">
                {BREEDING_TYPE_LABELS[lot.tipo]}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-cream">
              {getColonyLabel(lot.coloniaDonante)}
            </h3>
            <p className="text-sm text-husk">
              Inicio {formatDate(lot.fechaInicio)} · {daysElapsed} días transcurridos
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-5 h-5 text-cream" />
          </button>
        </div>

        {/* Alert */}
        {alertBanner && (
          <div className={`mb-4 p-3 rounded-lg border text-sm font-semibold ${alertBanner.color}`}>
            {alertBanner.text}
          </div>
        )}

        {/* Datos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-1">Portacúpulas</p>
            <p className="font-display text-lg font-bold text-cream">{lot.cantidadPortacupulas}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-1">Método de retiro</p>
            <p className="font-display text-lg font-bold text-cream">
              {lot.metodoRetiro === 'enjaular' ? 'Enjaular' : 'Realeras'}
            </p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-1">Enjaulado estimado</p>
            <p className="font-display text-lg font-bold text-honey">{formatDate(lot.fechaEnjauladoEstimada)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-1">Nacimiento estimado</p>
            <p className="font-display text-lg font-bold text-sage">{formatDate(lot.fechaNacimientoEstimada)}</p>
          </div>
        </div>

        {/* Receptoras */}
        <div className="mb-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-2">Colonias receptoras ({lot.coloniasReceptoras.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {lot.coloniasReceptoras.map(id => (
              <span key={id} className="rounded-lg border border-line bg-ink/50 px-2 py-0.5 font-mono text-[11px] text-cream">
                {getColonyLabel(id)}
              </span>
            ))}
          </div>
        </div>

        {/* Aceptación (día 3 del traslarve) */}
        <div className="mb-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-2">Aceptación</p>

          {lot.acceptance ? (
            <div className="card p-4">
              <div className="flex items-baseline gap-3">
                <p className="font-display text-3xl font-bold text-cream">
                  {lot.acceptance.acceptedCount}/{lot.acceptance.totalCount}
                </p>
                <p className="text-sm text-husk">{lot.acceptance.percentage}% de aceptación</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {acceptanceBadge && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest border ${acceptanceBadge.bg}`}>
                    {acceptanceBadge.label}
                  </span>
                )}
                <span className="text-xs text-husk">Registrado {formatDate(lot.acceptance.registeredAt)}</span>
              </div>
              {lot.acceptance.notes && (
                <p className="mt-2 text-sm italic text-husk/80">"{lot.acceptance.notes}"</p>
              )}
              <motion.button
                onClick={handleOpenAcceptanceModal}
                className="mt-3 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-husk hover:bg-ink/50 hover:text-cream"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Editar conteo
              </motion.button>
            </div>
          ) : lot.estado === 'aceptadas' ? (
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-orange-400/30">
              <div>
                <p className="font-semibold text-cream text-sm">Sin conteo registrado</p>
                <p className="text-xs text-husk mt-0.5">Este lote fue aceptado sin registrar cuántas celdas se aceptaron.</p>
              </div>
              <motion.button
                onClick={handleOpenAcceptanceModal}
                className="rounded-xl border border-honey/40 bg-honey/10 px-4 py-2 text-sm font-semibold text-honey hover:bg-honey/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Registrar conteo ahora
              </motion.button>
            </div>
          ) : shouldRegisterAcceptance ? (
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-husk">A los 3 días del traslarve revisa cuántas celdas fueron aceptadas.</p>
              <motion.button
                onClick={handleOpenAcceptanceModal}
                className="rounded-xl border border-honey/40 bg-honey/10 px-4 py-2 text-sm font-semibold text-honey hover:bg-honey/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Registrar aceptación
              </motion.button>
            </div>
          ) : (
            <div className="card p-4 flex items-center gap-3">
              <span className="text-xl text-honey">🕐</span>
              <div>
                <p className="font-semibold text-cream text-sm">
                  Revisión de aceptación en {Math.max(daysToAcceptance, 1)} {Math.max(daysToAcceptance, 1) === 1 ? 'día' : 'días'}
                </p>
                <p className="text-xs text-husk mt-0.5">A los 3 días del traslarve revisa cuántas celdas fueron aceptadas</p>
              </div>
            </div>
          )}

          {avgAcceptance !== null && (
            <p className="mt-2 text-xs text-husk">
              Tu promedio de aceptación: <span className="font-semibold text-honey">{avgAcceptance}%</span>
            </p>
          )}
        </div>

        {/* Notas */}
        {lot.notas && (
          <div className="mb-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-1">Notas</p>
            <p className="text-sm italic text-husk/80">"{lot.notas}"</p>
          </div>
        )}

        {/* Fotos del lote */}
        <div className="mb-5">
          <PhotoUploader
            photos={lot.fotos || []}
            onPhotosChange={(fotos: PhotoData[]) => onUpdate(lot.id, { fotos })}
          />
        </div>

        {/* Acciones */}
        <div className="space-y-2 mb-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-2">Acciones</p>
          <div className="flex flex-wrap gap-2">
            {/* Cambiar estado */}
            {nextStates.length > 0 && (
              <div className="relative" data-state-menu>
                <motion.button
                  onClick={() => setShowStateMenu(!showStateMenu)}
                  className="rounded-xl border border-honey/40 bg-honey/10 px-4 py-2 text-sm font-semibold text-honey hover:bg-honey/20"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cambiar estado ▾
                </motion.button>
                {showStateMenu && (
                  <div
                    className="absolute left-0 top-full mt-1 min-w-full w-max max-w-[min(256px,calc(100vw-2rem))] card p-2 z-50"
                    style={{ maxWidth: 'min(256px, calc(100vw - 2rem))' }}
                  >
                    {nextStates.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdate(lot.id, { estado: s });
                          setShowStateMenu(false);
                        }}
                        className="block w-full text-left whitespace-nowrap px-3 py-2 text-sm text-cream hover:bg-pane2 rounded-lg transition-colors"
                      >
                        {BREEDING_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {lot.metodoRetiro === 'enjaular' && lot.estado === 'enRealeras' && daysUntilEnjaulado <= 0 && (
              <motion.button
                onClick={() => onUpdate(lot.id, { estado: 'enjauladas' })}
                className="rounded-xl border border-orange-400/40 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-400 hover:bg-orange-400/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Registrar enjaulado
              </motion.button>
            )}

            {lot.estado === 'enjauladas' && (
              <motion.button
                onClick={() => onUpdate(lot.id, { estado: 'nacidas' })}
                className="rounded-xl border border-sage/40 bg-sage/10 px-4 py-2 text-sm font-semibold text-sage hover:bg-sage/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Registrar nacimiento
              </motion.button>
            )}

            {(lot.estado === 'nacidas' || lot.estado === 'fecundando') && lot.estado !== 'fecundando' && (
              <motion.button
                onClick={() => onUpdate(lot.id, { estado: 'fecundando' })}
                className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-400/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Marcar como fecundada
              </motion.button>
            )}

            {lot.estado === 'aceptadas' && (
              hasAssignedQueen ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-sage/40 bg-sage/10 px-4 py-2 text-sm font-semibold text-sage">
                  ✓ Reina asignada a colmena
                </span>
              ) : (
                <motion.button
                  onClick={() => onRequestAssign && onRequestAssign(lot.id)}
                  className="rounded-xl border border-sage/40 bg-sage/10 px-4 py-2 text-sm font-semibold text-sage hover:bg-sage/20"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  👑 ¿Asignar a colmena?
                </motion.button>
              )
            )}

            {lot.estado !== 'aceptadas' && lot.estado !== 'perdidas' && (
              <motion.button
                onClick={handleOpenAcceptanceModal}
                className="rounded-xl border border-sage/40 bg-sage/10 px-4 py-2 text-sm font-semibold text-sage hover:bg-sage/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Marcar como aceptada
              </motion.button>
            )}

            {lot.estado !== 'perdidas' && (
              <motion.button
                onClick={() => onUpdate(lot.id, { estado: 'perdidas' })}
                className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Marcar como perdida
              </motion.button>
            )}

            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-coral/30 px-4 py-2 text-sm font-medium text-coral hover:bg-coral/10"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Eliminar
            </motion.button>
          </div>
        </div>

        {/* Historial de estados */}
        {lot.estadoHistorial.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-husk mb-2">Historial de estados</p>
            <div className="space-y-1.5">
              {lot.estadoHistorial.slice().reverse().map((entry, idx) => {
                const color = entry.estado === 'aceptacion' ? '#f97316' : BREEDING_STATUS_COLORS[entry.estado];
                const label = entry.estado === 'aceptacion' ? (entry.descripcion || 'Aceptación') : BREEDING_STATUS_LABELS[entry.estado];
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="font-semibold text-cream">{label}</span>
                    {entry.estado !== 'aceptacion' && entry.descripcion && <span className="text-husk">{entry.descripcion}</span>}
                    <span className="text-husk">{formatDate(entry.fecha)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de aceptación */}
        {showAcceptanceModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowAcceptanceModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="card relative max-w-sm w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-1">Registrar aceptación de celdas</h4>
              <p className="text-sm text-husk mb-4">
                Lote {lot.id.slice(-6).toUpperCase()} · {getColonyLabel(lot.coloniaDonante)}
              </p>
              <p className="text-sm text-cream mb-4">
                De {lot.cantidadPortacupulas} portacúpulas traslarvadas, ¿cuántas celdas reales fueron aceptadas?
              </p>

              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Celdas aceptadas
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={lot.cantidadPortacupulas}
                value={acceptanceInput}
                onChange={(e) => {
                  setAcceptanceInput(e.target.value);
                  setAcceptanceError('');
                }}
                placeholder="0"
                autoFocus
                className="w-full rounded-xl border border-line bg-ink px-4 py-4 text-center font-display text-4xl font-bold text-cream focus:border-honey/70 focus:outline-none mb-2"
              />

              {acceptanceError && (
                <p className="mb-2 text-sm font-semibold text-coral">{acceptanceError}</p>
              )}

              <div className="mb-4 rounded-xl border border-line bg-ink/50 p-3">
                <p className="text-sm text-husk">
                  <span className="font-display font-bold text-cream">{previewCount}</span> / {lot.cantidadPortacupulas} aceptadas (<span className="font-display font-bold text-cream">{previewPercentage}%</span>)
                </p>
                <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest border ${previewBadge.bg}`}>
                  {previewBadge.label}
                </span>
              </div>

              {showEarlyWarning && (
                <div className="mb-4 rounded-xl border border-orange-400/40 bg-orange-400/10 p-3 text-sm text-orange-400">
                  Aún no han pasado 3 días del traslarve (faltan {daysRemainingToAcceptance} {daysRemainingToAcceptance === 1 ? 'día' : 'días'}). ¿Registrar de todas formas?
                </div>
              )}

              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Notas <span className="normal-case font-normal text-husk/50">(opcional)</span>
              </label>
              <textarea
                value={acceptanceNotes}
                onChange={(e) => setAcceptanceNotes(e.target.value)}
                placeholder="Ej: C-04 aceptó mejor que C-02"
                rows={2}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-cream focus:border-honey/70 mb-5 resize-none"
              />

              <div className="flex gap-2">
                <motion.button
                  onClick={() => setShowAcceptanceModal(false)}
                  className="flex-1 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleSaveAcceptance}
                  className="flex-1 rounded-xl bg-honey py-2 text-sm font-semibold text-ink hover:bg-honeysoft"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Confirmar aceptación
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Confirmación eliminar */}
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />

            {/* Modal - centrado encima del backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="card relative max-w-sm w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-2">¿Eliminar lote?</h4>
              <p className="text-sm text-husk mb-5">Esta acción no se puede deshacer. Los eventos del calendario asociados también se eliminarán.</p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => {
                    onDelete(lot.id);
                    onClose();
                  }}
                  className="flex-1 rounded-xl bg-coral py-2 text-sm font-semibold text-white hover:bg-coral/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Eliminar
                </motion.button>
                <motion.button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}