import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Hive } from '../types/hive';
import type { BreedingLot, BreedingStatus } from '../types/breeding';
import { BREEDING_STATUS_LABELS, BREEDING_STATUS_COLORS, BREEDING_TYPE_LABELS } from '../types/breeding';
import type { Queen } from '../types/queen';
import { IconX } from '../ui';
import PhotoUploader from './PhotoUploader';
import type { PhotoData } from '../services/photos';

interface BreedingDetailProps {
  lot: BreedingLot;
  hives: Hive[];
  nuclei: Hive[];
  onClose: () => void;
  onUpdate: (lotId: string, updates: Partial<BreedingLot>) => void;
  onDelete: (lotId: string) => void;
  queens?: Queen[];
  onRequestAssign?: (lotId: string) => void;
}

const STATUS_FLOW: BreedingStatus[] = ['enRealeras', 'enjauladas', 'nacidas', 'fecundando', 'aceptadas'];

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

export default function BreedingDetail({ lot, hives, nuclei, onClose, onUpdate, onDelete, queens = [], onRequestAssign }: BreedingDetailProps) {
  const allColonies = [...hives, ...nuclei];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStateMenu, setShowStateMenu] = useState(false);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteConfirm]);

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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
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
              <div className="relative">
                <motion.button
                  onClick={() => setShowStateMenu(!showStateMenu)}
                  className="rounded-xl border border-honey/40 bg-honey/10 px-4 py-2 text-sm font-semibold text-honey hover:bg-honey/20"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cambiar estado ▾
                </motion.button>
                {showStateMenu && (
                  <div className="absolute left-0 top-full mt-1 w-48 card p-2 z-50">
                    {nextStates.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdate(lot.id, { estado: s });
                          setShowStateMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-cream hover:bg-pane2 rounded-lg transition-colors"
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
                onClick={() => onUpdate(lot.id, { estado: 'aceptadas' })}
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
              {lot.estadoHistorial.slice().reverse().map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: BREEDING_STATUS_COLORS[entry.estado] }}
                  />
                  <span className="font-semibold text-cream">{BREEDING_STATUS_LABELS[entry.estado]}</span>
                  <span className="text-husk">{formatDate(entry.fecha)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmación eliminar */}
        {showDeleteConfirm &&
          createPortal(
            <motion.div
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="card max-w-sm w-full p-6"
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
            </motion.div>,
            document.body,
          )}
      </motion.div>
    </motion.div>
  );
}