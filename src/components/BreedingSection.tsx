import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, parseISO, format, subMonths, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Hive } from '../types/hive';
import type { BreedingLot } from '../types/breeding';
import { BREEDING_STATUS_LABELS, BREEDING_STATUS_COLORS, BREEDING_TYPE_LABELS } from '../types/breeding';
import type { Queen } from '../types/queen';
import { IconPlus, IconQueen, IconTrash } from '../ui';
import BreedingForm from './BreedingForm';
import BreedingDetail from './BreedingDetail';
import { useScrollLock } from '../hooks/useScrollLock';
import { useClosingPanel } from '../hooks/useClosingPanel';
import { backdropVariants, modalVariants } from '../lib/motion';

interface BreedingSectionProps {
  hives: Hive[];
  nuclei: Hive[];
  breedingLots: BreedingLot[];
  onUpdateLots: (lots: BreedingLot[]) => void;
  onAddCalendarEvent: (event: { title: string; date: string; description: string }) => void;
  onDeleteCalendarEvent: (titlePattern: string) => void;
  onAddCuadernoEntry: (text: string) => void;
  onShowToast?: (title: string, desc?: string) => void;
  queens?: Queen[];
  focusLotId?: string | null;
  onConsumeFocusLot?: () => void;
  onAssignQueenFromLot?: (lotId: string, hiveId: string) => void;
}

const STATUS_FLOW: BreedingLot['estado'][] = ['enRealeras', 'enjauladas', 'nacidas', 'fecundando', 'aceptadas'];

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

export default function BreedingSection({
  hives, nuclei, breedingLots, onUpdateLots,
  onAddCalendarEvent, onDeleteCalendarEvent, onAddCuadernoEntry, onShowToast,
  queens = [],
  focusLotId,
  onConsumeFocusLot,
  onAssignQueenFromLot,
}: BreedingSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [detailLotId, setDetailLotId] = useState<string | null>(null);
  const [openStateMenuId, setOpenStateMenuId] = useState<string | null>(null);
  const [confirmDeleteLotId, setConfirmDeleteLotId] = useState<string | null>(null);
  const [assignLotId, setAssignLotId] = useState<string | null>(null);
  const [assignHiveId, setAssignHiveId] = useState<string>('');
  const allColonies = [...hives, ...nuclei];

  // Al reabrir un detalle se cancela cualquier cierre pendiente.
  const { cancelClosing } = useClosingPanel();

  const openDetail = (id: string) => {
    cancelClosing();
    setDetailLotId(id);
  };

  // Cierre inmediato: en superposición la animación de salida la gestiona
  // AnimatePresence, así que ya no hace falta el retardo de `beginClose`
  // (que estaba pensado para animar la altura del acordeón).
  const requestClose = () => setDetailLotId(null);

  useScrollLock(!!assignLotId || !!confirmDeleteLotId || !!detailLotId);

  useEffect(() => {
    if (!confirmDeleteLotId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDeleteLotId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDeleteLotId]);

  // Esc cierra la superposición del detalle.
  useEffect(() => {
    if (!detailLotId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailLotId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailLotId]);

  useEffect(() => {
    if (!openStateMenuId) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-state-menu]')) {
        setOpenStateMenuId(null);
      }
    };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [openStateMenuId]);

  const today = new Date();

  const activeLots = useMemo(() =>
    breedingLots
      .filter(l => l.estado !== 'perdidas' && l.estado !== 'aceptadas')
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()),
    [breedingLots],
  );

  const historyLots = useMemo(() => {
    const threeMonthsAgo = subMonths(today, 3);
    return breedingLots
      .filter(l => (l.estado === 'perdidas' || l.estado === 'aceptadas'))
      .filter(l => isAfter(parseISO(l.fechaInicio), threeMonthsAgo))
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  }, [breedingLots, today]);

  const fecundandoCount = breedingLots.filter(l => l.estado === 'fecundando').length;

  const avgAcceptance = useMemo(() => {
    const withAcceptance = breedingLots.filter(l => l.acceptance);
    if (withAcceptance.length === 0) return null;
    const sum = withAcceptance.reduce((acc, l) => acc + (l.acceptance?.percentage ?? 0), 0);
    return Math.round(sum / withAcceptance.length);
  }, [breedingLots]);

  const getColonyLabel = (id: string) => {
    const colony = allColonies.find(c => c.id === id);
    return colony ? `${colony.code}${colony.name ? ` · ${colony.name}` : ''}` : '—';
  };

  const getLotLabel = (id: string) => {
    const lot = breedingLots.find(l => l.id === id);
    return lot
      ? `Lote ${id.slice(-6).toUpperCase()} · ${BREEDING_TYPE_LABELS[lot.tipo]}`
      : `Lote ${id.slice(-6).toUpperCase()}`;
  };

  const hasQueenFromLot = (lotId: string) => queens.some(q => q.loteId === lotId);

  const assignQueenFromLot = (lotId: string, hiveId: string) => {
    if (onAssignQueenFromLot) {
      onAssignQueenFromLot(lotId, hiveId);
    }
    setAssignLotId(null);
    setAssignHiveId('');
  };

  // Abrir directamente un lote del apiario (vinculado desde una reina)
  useEffect(() => {
    if (focusLotId) {
      openDetail(focusLotId);
      onConsumeFocusLot?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLotId]);

  const getLotAlert = (lot: BreedingLot) => {
    if (lot.estado === 'perdidas') return null;
    const daysUntilEnjaulado = differenceInDays(parseISO(lot.fechaEnjauladoEstimada), today);
    const daysUntilBirth = differenceInDays(parseISO(lot.fechaNacimientoEstimada), today);
    const isOverdueBirth = lot.estado !== 'nacidas' && lot.estado !== 'fecundando' && lot.estado !== 'aceptadas' && today > parseISO(lot.fechaNacimientoEstimada);

    if (isOverdueBirth) return { color: 'bg-coral/15 border-coral/40 text-coral', text: 'Atrasado' };
    if (daysUntilBirth >= 0 && daysUntilBirth <= 2) return { color: 'bg-sage/15 border-sage/40 text-sage', text: 'Nacimiento pronto' };
    if (daysUntilEnjaulado === 0) return { color: 'bg-honey/15 border-honey/40 text-honey', text: 'Día de enjaulado' };
    if (daysUntilEnjaulado === 1) return { color: 'bg-orange-400/15 border-orange-400/40 text-orange-400', text: 'Enjaulado mañana' };
    return null;
  };

  const handleCreate = (draft: Omit<BreedingLot, 'id' | 'fechaCreacion' | 'estado' | 'estadoHistorial'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const newLot: BreedingLot = {
      ...draft,
      id,
      fechaCreacion: now,
      estado: 'enRealeras',
      estadoHistorial: [{ estado: 'enRealeras', fecha: now }],
    };
    onUpdateLots([newLot, ...breedingLots]);

    // Calendar events
    onAddCalendarEvent({
      title: `Enjaulado - Lote ${newLot.id.slice(-6).toUpperCase()}`,
      date: newLot.fechaEnjauladoEstimada,
      description: `Lote de cría ${newLot.tipo} con donante ${getColonyLabel(newLot.coloniaDonante)}`,
    });
    onAddCalendarEvent({
      title: `Nacimiento esperado - Lote ${newLot.id.slice(-6).toUpperCase()}`,
      date: newLot.fechaNacimientoEstimada,
      description: `Nacimiento estimado lote ${newLot.tipo}`,
    });

    // Notebook
    onAddCuadernoEntry(`Iniciado lote de cría de reinas (${newLot.tipo}) con colonia donante ${getColonyLabel(newLot.coloniaDonante)}`);

    setShowForm(false);
  };

  const handleUpdate = (lotId: string, updates: Partial<BreedingLot>) => {
    const lot = breedingLots.find(l => l.id === lotId);
    if (!lot) return;
    const now = new Date().toISOString();
    const newEstado = updates.estado;
    const newAcceptance = updates.acceptance;
    let estadoHistorial = lot.estadoHistorial;
    if (newEstado) {
      estadoHistorial = [...estadoHistorial, { estado: newEstado, fecha: now }];
    }
    if (newAcceptance) {
      estadoHistorial = [...estadoHistorial, {
        estado: 'aceptacion',
        fecha: now,
        descripcion: `Aceptadas: ${newAcceptance.acceptedCount}/${newAcceptance.totalCount} celdas (${newAcceptance.percentage}%)`,
      }];
    }
    const updated: BreedingLot = {
      ...lot,
      ...updates,
      estadoHistorial,
    };
    onUpdateLots(breedingLots.map(l => l.id === lotId ? updated : l));
    if (newEstado) {
      onAddCuadernoEntry(`Lote de cría cambiado a ${BREEDING_STATUS_LABELS[newEstado]}`);
    }
    if (newAcceptance) {
      onAddCuadernoEntry(`Lote ${lot.id.slice(-6).toUpperCase()}: aceptación de ${newAcceptance.acceptedCount}/${newAcceptance.totalCount} celdas (${newAcceptance.percentage}%)`);
      onShowToast?.(
        'Aceptación registrada',
        `${newAcceptance.acceptedCount}/${newAcceptance.totalCount} (${newAcceptance.percentage}%)`,
      );
    }
  };

  const handleDelete = (lotId: string) => {
    const lot = breedingLots.find(l => l.id === lotId);
    if (!lot) return;
    onUpdateLots(breedingLots.filter(l => l.id !== lotId));
    const suffix = lot.id.slice(-6).toUpperCase();
    onDeleteCalendarEvent(`Enjaulado - Lote ${suffix}`);
    onDeleteCalendarEvent(`Nacimiento esperado - Lote ${suffix}`);
  };

  const selectedLot = detailLotId ? breedingLots.find(l => l.id === detailLotId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="tick-label mb-2 flex items-center gap-2">
          <IconQueen className="h-3.5 w-3.5 text-honey" />
          Cría de reinas
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">Cría de Reinas</h2>
        <p className="mt-1 font-mono text-xs text-husk">
          {activeLots.length} lotes activos{fecundandoCount > 0 ? ` · ${fecundandoCount} en fecundación` : ''}
          {avgAcceptance !== null ? ` · Promedio de aceptación: ${avgAcceptance}%` : ''}
        </p>
      </div>

      {/* Lista de lotes activos */}
      {activeLots.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">👑</div>
          <p className="text-husk text-lg">No hay lotes de cría activos</p>
          <p className="text-xs text-husk/60 mt-2">Crea tu primer lote con el botón +</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLots.map((lot, idx) => {
            const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
            const alert = getLotAlert(lot);
            return (
              <motion.div
                key={lot.id}
                className="card p-4 sm:p-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
                        style={{ color: BREEDING_STATUS_COLORS[lot.estado], background: BREEDING_STATUS_COLORS[lot.estado] + '1c', border: `1px solid ${BREEDING_STATUS_COLORS[lot.estado]}55` }}
                      >
                        {BREEDING_STATUS_LABELS[lot.estado]}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest bg-honey/15 text-honey border border-honey/40">
                        {BREEDING_TYPE_LABELS[lot.tipo]}
                      </span>
                      {alert && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${alert.color}`}>
                          {alert.text}
                        </span>
                      )}
                      {!lot.acceptance && daysElapsed >= 3 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border bg-orange-400/15 border-orange-400/40 text-orange-400">
                          Revisar aceptación
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-cream text-sm">
                      Donante: {getColonyLabel(lot.coloniaDonante)}
                    </p>
                    <p className="text-xs text-husk mt-0.5">
                      {formatDate(lot.fechaInicio)} · {daysElapsed} días transcurridos · {lot.cantidadPortacupulas} portacúpulas
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Cambiar estado */}
                    <div className="relative" data-state-menu>
                      <motion.button
                        onClick={() => setOpenStateMenuId(openStateMenuId === lot.id ? null : lot.id)}
                        className="rounded-lg border border-honey/40 bg-honey/10 px-3 py-1.5 text-[11px] font-semibold text-honey hover:bg-honey/20"
                        whileTap={{ scale: 0.95 }}
                      >
                        Cambiar estado ▾
                      </motion.button>
                      {openStateMenuId === lot.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-full mt-1 min-w-full w-max max-w-[min(256px,calc(100vw-2rem))] card p-2 z-40"
                          style={{ maxWidth: 'min(256px, calc(100vw - 2rem))' }}
                        >
                          {STATUS_FLOW
                            .filter(s => s !== lot.estado && s !== 'perdidas')
                            .map(s => (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdate(lot.id, { estado: s });
                                  setOpenStateMenuId(null);
                                }}
                                className="block w-full text-left whitespace-nowrap px-3 py-2 text-sm text-cream hover:bg-pane2 rounded-lg transition-colors"
                              >
                                {BREEDING_STATUS_LABELS[s]}
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </div>
                    {/* Asignar a colmena cuando el lote está aceptado */}
                    {lot.estado === 'aceptadas' && !hasQueenFromLot(lot.id) && (
                      <motion.button
                        onClick={() => {
                          setAssignLotId(lot.id);
                          setAssignHiveId(lot.coloniasReceptoras[0] || '');
                        }}
                        className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-1.5 text-[11px] font-semibold text-sage hover:bg-sage/20"
                        whileTap={{ scale: 0.95 }}
                        title="Asignar reina a colmena"
                      >
                        👑 Asignar a colmena
                      </motion.button>
                    )}
                    {/* Eliminar */}
                    <motion.button
                      onClick={() => setConfirmDeleteLotId(lot.id)}
                      className="rounded-lg border border-coral/30 px-3 py-1.5 text-[11px] font-semibold text-coral hover:bg-coral/10"
                      whileTap={{ scale: 0.95 }}
                      title="Eliminar lote"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </motion.button>
                    {/* Disparador del detalle. Antes era un <svg> suelto sin
                        onClick, dentro de un contenedor con stopPropagation, por
                        que no hacia nada. */}
                    <motion.button
                      type="button"
                      onClick={() => openDetail(lot.id)}
                      className="rounded-lg border border-line p-1.5 text-husk transition-colors hover:border-honey/50 hover:text-cream"
                      whileTap={{ scale: 0.95 }}
                      title="Ver detalle del lote"
                      aria-label={`Ver detalle del lote ${getLotLabel(lot.id)}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Historial */}
      {historyLots.length > 0 && (
        <div>
          <p className="tick-label mb-3 flex items-center gap-2">
            <IconQueen className="h-3 w-3 text-husk" />
            Historial de lotes
          </p>
          <div className="space-y-2">
            {historyLots.map((lot) => {
              const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
              return (
                <div key={lot.id} className="card p-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => openDetail(lot.id)}>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: BREEDING_STATUS_COLORS[lot.estado] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-cream uppercase">{BREEDING_TYPE_LABELS[lot.tipo]}</span>
                        <span className="text-[10px] font-mono text-husk">{getColonyLabel(lot.coloniaDonante)}</span>
                      </div>
                      <p className="text-xs text-husk">
                        {formatDate(lot.fechaInicio)} · {daysElapsed} días · {BREEDING_STATUS_LABELS[lot.estado]}
                        {lot.acceptance ? ` · ${lot.acceptance.percentage}% aceptación` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <motion.button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-honey text-ink shadow-lg hover:bg-honeysoft"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <IconPlus className="h-6 w-6" />
      </motion.button>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <BreedingForm
            hives={hives}
            nuclei={nuclei}
            onClose={() => setShowForm(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>

      {/* Detalle del lote: SUPERPOSICIÓN.
          Antes se desplegaba inline al final de la lista (accordion-grid) y
          empujaba el contenido hacia abajo. Ahora flota sobre la vista. El
          cierre sale por: la X del propio detalle, el fondo, o la tecla Esc. */}
      <AnimatePresence>
        {selectedLot && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 touch-none"
            onClick={requestClose}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md max-h-[80dvh] md:max-h-[85vh] bg-[#1a140d] rounded-2xl flex flex-col border border-yellow-900/30 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <BreedingDetail
                lot={selectedLot}
                hives={hives}
                nuclei={nuclei}
                breedingLots={breedingLots}
                closing={false}
                onClose={requestClose}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                queens={queens}
                onRequestAssign={(lotId) => {
                  setAssignLotId(lotId);
                  setAssignHiveId(selectedLot.coloniasReceptoras[0] || '');
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asignar reina a colmena desde un lote aceptado */}
      <AnimatePresence>
        {assignLotId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
            onClick={() => setAssignLotId(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">👑</span>
                <div>
                  <h4 className="font-display text-xl font-bold text-cream">¿Asignar a colmena?</h4>
                  <p className="text-xs text-husk mt-0.5">
                    {getLotLabel(assignLotId)} · crear reina vinculada a este lote
                  </p>
                </div>
              </div>

              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Colmena / núcleo destino
              </label>
              <select
                value={assignHiveId}
                onChange={(e) => setAssignHiveId(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 mb-5"
              >
                <option value="">Seleccionar destino</option>
                {allColonies.map(colony => (
                  <option key={colony.id} value={colony.id}>
                    {getColonyLabel(colony.id)}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <motion.button
                  onClick={() => assignQueenFromLot(assignLotId, assignHiveId)}
                  disabled={!assignHiveId}
                  className="flex-1 rounded-xl bg-honey py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft disabled:opacity-40 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Asignar reina
                </motion.button>
                <motion.button
                  onClick={() => setAssignLotId(null)}
                  className="flex-1 rounded-xl border border-line py-2.5 text-sm font-medium text-husk hover:bg-ink/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación de eliminación desde la lista */}
      <AnimatePresence>
        {confirmDeleteLotId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
              onClick={() => setConfirmDeleteLotId(null)}
            />

            {/* Modal - centrado encima del backdrop */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative max-w-sm w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-2">¿Eliminar lote?</h4>
              <p className="text-sm text-husk mb-5">
                Esta acción no se puede deshacer. Los eventos del calendario asociados también se eliminarán.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => {
                    handleDelete(confirmDeleteLotId);
                    setConfirmDeleteLotId(null);
                  }}
                  className="flex-1 rounded-xl bg-coral py-2 text-sm font-semibold text-white hover:bg-coral/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Eliminar
                </motion.button>
                <motion.button
                  onClick={() => setConfirmDeleteLotId(null)}
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
      </AnimatePresence>
    </div>
  );
}