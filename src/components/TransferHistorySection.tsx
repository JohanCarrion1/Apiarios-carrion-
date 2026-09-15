import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconRefresh, IconLayers, IconTrash, IconCheck } from '../ui';
import { loadTransferHistory, clearTransferHistory, saveTransferHistory } from '../services/transfers';
import type { TransferRecord, TransferType } from '../types/transfer';

interface Props {
  userId?: string;
  apiaries?: { id: string; name?: string }[];
  onShowToast?: (title: string, desc?: string) => void;
}

const TYPE_COLORS: Record<TransferType, string> = {
  nucleo_a_colmena: '#f0a41c',
  nucleo_apiario: '#a3bf7f',
  colmena_apiario: '#6fa8dc',
};

const TYPE_LABELS: Record<TransferType, string> = {
  nucleo_a_colmena: 'Núcleo → Colmena',
  nucleo_apiario: 'Núcleo entre apiarios',
  colmena_apiario: 'Colmena entre apiarios',
};

function TypeIcon({ tipo, className }: { tipo: TransferType; className?: string }) {
  if (tipo === 'nucleo_a_colmena') return <IconRefresh className={className || ''} />;
  return <IconLayers className={className || ''} />;
}

const monthKey = (iso: string) => iso.slice(0, 7);

function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

type ConfirmAction = 'clear' | 'selected' | 'single' | null;

export default function TransferHistorySection({ userId, apiaries = [], onShowToast }: Props) {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [filterTipo, setFilterTipo] = useState<'all' | TransferType>('all');
  const [filterMes, setFilterMes] = useState<string>('all');
  const [filterApiario, setFilterApiario] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [singleId, setSingleId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!userId) {
      setRecords([]);
      return;
    }
    setRecords(loadTransferHistory(userId));
  }, [userId]);

  useEffect(() => {
    if (!confirmAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClearing) setConfirmAction(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmAction, isClearing]);

  const apiaryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    apiaries.forEach(a => {
      if (a.id) map[a.id] = a.name || 'Sin nombre';
    });
    return map;
  }, [apiaries]);

  const months = useMemo(() => {
    const set = new Set(records.map(r => monthKey(r.fecha)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterTipo !== 'all' && r.tipo !== filterTipo) return false;
      if (filterMes !== 'all' && monthKey(r.fecha) !== filterMes) return false;
      if (filterApiario !== 'all') {
        if (r.desdeApiarioId !== filterApiario && r.hastaApiarioId !== filterApiario) return false;
      }
      return true;
    });
  }, [records, filterTipo, filterMes, filterApiario]);

  const hasFilters = filterTipo !== 'all' || filterMes !== 'all' || filterApiario !== 'all';

  const selectedCount = selectedIds.length;
  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id));

  const persistAndSet = (next: TransferRecord[]) => {
    setRecords(next);
    if (userId) {
      try {
        saveTransferHistory(userId, next);
      } catch (error) {
        console.error('[TRANSFERS] Error al guardar historial:', error);
      }
    }
  };

  const handleStartSelection = () => {
    setSelectedIds([]);
    setSelectionMode(true);
  };

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      const selected = new Set(selectedIds);
      filtered.forEach(r => selected.delete(r.id));
      setSelectedIds(Array.from(selected));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...filtered.map(r => r.id)])));
    }
  };

  const handleConfirmClear = async () => {
    if (isClearing || !userId) return;
    setIsClearing(true);
    console.log('[CLEAR] Limpiando historial...');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      clearTransferHistory(userId);
      setRecords([]);
      setConfirmAction(null);
      console.log('[CLEAR] Historial vaciado y guardado en localStorage');
      onShowToast?.('Historial limpiado');
    } catch (error) {
      console.error('[TRANSFERS] Error al limpiar historial:', error);
      onShowToast?.('Error al limpiar el historial');
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!userId) return;
    if (confirmAction === 'single' && singleId) {
      const next = records.filter(r => r.id !== singleId);
      persistAndSet(next);
      console.log('[TRANSFERS] Registro eliminado:', singleId);
      onShowToast?.('Registro eliminado');
      setSingleId(null);
    } else if (confirmAction === 'selected') {
      const count = selectedIds.length;
      const next = records.filter(r => !selectedIds.includes(r.id));
      persistAndSet(next);
      console.log(`[TRANSFERS] ${count} registros eliminados`);
      onShowToast?.(`${count} registros eliminados`);
      handleExitSelection();
    }
    setConfirmAction(null);
  };

  const openSingleDelete = (id: string) => {
    setSingleId(id);
    setConfirmAction('single');
  };

  const singleRecord = confirmAction === 'single' && singleId ? records.find(r => r.id === singleId) : undefined;

  const modalTitle =
    confirmAction === 'clear'
      ? 'Limpiar historial de transferencias'
      : confirmAction === 'selected'
        ? 'Eliminar registros seleccionados'
        : 'Eliminar registro';

  const modalText =
    confirmAction === 'clear'
      ? '¿Eliminar los <strong class="text-cream">{0}</strong> registros del historial? Esta acción no afecta colmenas, núcleos ni apiarios, solo el registro de movimientos.'
      : confirmAction === 'selected'
        ? '¿Eliminar los <strong class="text-cream">{0}</strong> registros seleccionados? Esta acción no afecta colmenas, núcleos ni apiarios.'
        : confirmAction === 'single'
          ? `¿Eliminar este registro${singleRecord ? ` (<strong class="text-cream">${singleRecord.entidadCodigo}</strong>)` : ''}? Esta acción no afecta colmenas, núcleos ni apiarios.`
          : '';

  const modalCount = confirmAction === 'clear' ? records.length : confirmAction === 'selected' ? selectedCount : 1;

  const confirmLabel = confirmAction === 'clear' ? 'Limpiar' : 'Eliminar';

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="tick-label">Filtros</p>
          {hasFilters && (
            <button
              onClick={() => {
                setFilterTipo('all');
                setFilterMes('all');
                setFilterApiario('all');
              }}
              className="text-xs font-mono text-husk hover:text-cream underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
              Tipo
            </label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as 'all' | TransferType)}
              className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-cream focus:border-honey/70"
            >
              <option value="all">Todos</option>
              <option value="nucleo_a_colmena">Núcleo → Colmena</option>
              <option value="nucleo_apiario">Núcleo entre apiarios</option>
              <option value="colmena_apiario">Colmena entre apiarios</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
              Fecha
            </label>
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-cream focus:border-honey/70"
            >
              <option value="all">Todas</option>
              {months.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
              Apiario
            </label>
            <select
              value={filterApiario}
              onChange={(e) => setFilterApiario(e.target.value)}
              className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-cream focus:border-honey/70"
            >
              <option value="all">Todos</option>
              {apiaries.map(a => (
                <option key={a.id} value={a.id}>{a.name || 'Sin nombre'}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Lista de transferencias */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="tick-label">Historial ({filtered.length})</p>
          {records.length > 0 && !selectionMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartSelection}
                className="flex items-center gap-1.5 rounded-lg border border-honey/40 px-3 py-1.5 text-xs font-medium text-honey hover:bg-honey/10 transition-colors"
              >
                <IconCheck className="h-3.5 w-3.5" />
                Seleccionar
              </button>
              <button
                onClick={() => setConfirmAction('clear')}
                className="flex items-center gap-1.5 rounded-lg border border-coral/40 px-3 py-1.5 text-xs font-medium text-coral hover:bg-coral/10 transition-colors"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Limpiar historial
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            {records.length === 0 ? (
              <>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-husk/10">
                  <IconLayers className="h-8 w-8 text-husk/50" />
                </div>
                <p className="font-medium text-cream">Sin movimientos registrados aún</p>
                <p className="text-sm text-husk/60 mt-1">
                  Aquí verás conversiones de núcleos a colmenas y traslados entre apiarios
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-husk">Ninguna transferencia coincide con los filtros.</p>
              </>
            )}
          </div>
        ) : (
          <div className={`space-y-3 ${selectionMode ? 'pb-28' : ''}`}>
            {filtered.map((r, index) => {
              const color = TYPE_COLORS[r.tipo];
              const isApiarioMove = r.tipo !== 'nucleo_a_colmena';
              const isSelected = selectionMode && selectedIds.includes(r.id);
              return (
                <motion.div
                  key={r.id}
                  className={`card relative p-5 transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-honey/50 ring-1 ring-honey/40' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => selectionMode && handleToggleSelect(r.id)}
                >
                  {/* Ícono de basura individual (esquina superior derecha) */}
                  {!selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSingleDelete(r.id);
                      }}
                      aria-label="Eliminar registro"
                      className="absolute right-3 top-3 rounded-lg p-1.5 text-husk/40 transition-colors hover:bg-coral/10 hover:text-coral"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Checkbox circular en modo selección */}
                    {selectionMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(r.id);
                        }}
                        aria-label="Seleccionar registro"
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'border-honey bg-honey text-ink' : 'border-husk/40 text-transparent hover:border-husk'}`}
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Ícono del tipo */}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: color + '20', border: `2px solid ${color}` }}
                    >
                      <TypeIcon tipo={r.tipo} className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={`flex flex-wrap items-center justify-between gap-2 mb-1 ${!selectionMode ? 'pr-6' : ''}`}>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-husk">
                          {formatDate(r.fecha)}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                          style={{ color, background: color + '1c', border: `1px solid ${color}55` }}
                        >
                          {TYPE_LABELS[r.tipo]}
                        </span>
                      </div>

                      {/* Código entidad */}
                      <p className="font-display text-2xl font-black tracking-tight text-cream">
                        {r.entidadCodigo}
                      </p>

                      {/* Origen → Destino */}
                      {isApiarioMove ? (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-husk">
                          <span className="font-semibold text-cream">
                            {r.desdeApiarioNombre || apiaryNameMap[r.desdeApiarioId || ''] || 'Apiario'}
                          </span>
                          <IconLayers className="h-3.5 w-3.5 text-honey" />
                          <span className="font-semibold text-cream">
                            {r.hastaApiarioNombre || apiaryNameMap[r.hastaApiarioId || ''] || 'Apiario'}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-husk">
                          <span className="font-semibold text-cream">{r.desdeApiarioNombre || 'Apiario'}</span>
                          {' '}→ colmena completa
                        </p>
                      )}

                      {/* Motivo */}
                      {r.motivo && (
                        <p className="mt-2 rounded-lg border border-honey/25 bg-honey/5 px-3 py-1.5 text-xs italic text-husk">
                          Motivo: {r.motivo}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Barra inferior fija del modo selección */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-pane2/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-husk">
                {selectedCount} seleccionad{selectedCount === 1 ? 'o' : 'os'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk transition-colors hover:bg-pane2"
                >
                  {allFilteredSelected ? 'Quitar todo' : 'Seleccionar todo'}
                </button>
                <button
                  onClick={() => setConfirmAction('selected')}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-coral px-3 py-2 text-xs font-semibold text-cream transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  Eliminar seleccionados
                </button>
                <button
                  onClick={handleExitSelection}
                  className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk transition-colors hover:bg-pane2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación (estructura FIX 1: fixed inset-0 z-[100], tarjeta relative, SIN portal) */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isClearing && setConfirmAction(null)}
            />

            {/* Modal - tarjeta relative, encima del backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative card max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20"
              >
                <IconTrash className="h-8 w-8 text-coral" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center font-display text-2xl font-bold text-cream mb-2"
              >
                {modalTitle}
              </motion.h3>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <p
                  className="text-husk mb-3"
                  dangerouslySetInnerHTML={{
                    __html: modalText.replace('{0}', String(modalCount)),
                  }}
                />
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3">
                  <p className="text-xs text-coral">
                    <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3"
              >
                <motion.button
                  onClick={() => setConfirmAction(null)}
                  disabled={isClearing}
                  className="flex-1 px-4 py-3 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={!isClearing ? { scale: 1.02 } : {}}
                  whileTap={!isClearing ? { scale: 0.98 } : {}}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={confirmAction === 'clear' ? handleConfirmClear : handleConfirmDelete}
                  disabled={isClearing}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-cream bg-coral rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={!isClearing ? { scale: 1.02 } : {}}
                  whileTap={!isClearing ? { scale: 0.98 } : {}}
                >
                  {isClearing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full"
                      />
                      Limpiando...
                    </>
                  ) : (
                    <>
                      <IconTrash className="h-4 w-4" />
                      {confirmLabel}
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}