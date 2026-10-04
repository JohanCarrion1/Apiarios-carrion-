// ============================================================
// DETALLE DE CONTRATO DE POLINIZACIÓN (modal)
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import { IconCalendar, IconEdit, IconFlower, IconNote, IconTrash, IconX } from '../ui';
import type { Hive } from '../types/hive';
import type {
  ContratoPolinizacion,
  PolinizacionEstado,
} from '../types/polinizacion';
import {
  POLINIZACION_ESTADOS,
  POLINIZACION_ESTADO_LABELS,
  POLINIZACION_ESTADO_COLORS,
  formatSolesPolinizacion,
} from '../types/polinizacion';

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatFecha(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  open: boolean;
  contrato: ContratoPolinizacion | null;
  hives: Hive[];
  onClose: () => void;
  onEdit: (c: ContratoPolinizacion) => void;
  onDelete: (id: string) => void;
  onEstado: (id: string, estado: PolinizacionEstado) => void;
}

export default function PolinizacionDetail({
  open,
  contrato,
  hives,
  onClose,
  onEdit,
  onDelete,
  onEstado,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  useScrollLock(open);

  /* Esc cierra la superposición. Antes solo apagaba la confirmación de
     borrado, así que el modal no se cerraba con el teclado y el backdrop y el
     botón "X" eran la única salida. Ahora Esc es en dos pasos: si está
     armada la confirmación de borrado, la cancela (no cierra nada de golpe);
     si no, cierra. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirming) setConfirming(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, confirming, onClose]);

  // La confirmación de borrado es por contrato y por apertura: si se cerraba el
  // modal con "X" estando armada, al reabrirlo ya salía "¿Eliminar?".
  useEffect(() => {
    setConfirming(false);
  }, [open, contrato?.id]);

  const hiveName = (code: string) => hives.find((h) => h.code === code)?.name;

  return (
    <AnimatePresence>
      {open && contrato && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="polinizacion-detail-title"
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-pane p-6 sm:rounded-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-husk">
                  {contrato.id}
                </p>
                <h3
                  id="polinizacion-detail-title"
                  className="flex items-center gap-2 font-display text-2xl font-bold text-cream"
                >
                  <IconFlower className="h-5 w-5 text-flower" />
                  {contrato.cliente.nombre}
                </h3>
                <p className="mt-0.5 text-sm text-husk">
                  {contrato.cultivo} · {contrato.cantidadColmenas} colmenas ·{' '}
                  <span className="font-semibold text-honey">{formatSolesPolinizacion(contrato.total)}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
                aria-label="Cerrar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Estado */}
            <div className="mb-5">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-husk">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {POLINIZACION_ESTADOS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onEstado(contrato.id, s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      contrato.estado === s
                        ? ''
                        : 'border-line bg-ink text-husk hover:border-honey/50 hover:text-honey'
                    }`}
                    style={
                      contrato.estado === s
                        ? { backgroundColor: POLINIZACION_ESTADO_COLORS[s], color: '#161310' }
                        : undefined
                    }
                  >
                    {POLINIZACION_ESTADO_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Fechas + Ubicación */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-ink p-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-husk">
                  <IconCalendar className="h-3 w-3" /> Inicio
                </p>
                <p className="text-sm font-semibold text-cream">{formatFecha(contrato.fechaInicio)}</p>
              </div>
              <div className="rounded-xl border border-line bg-ink p-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-husk">
                  <IconCalendar className="h-3 w-3" /> Fin
                </p>
                <p className="text-sm font-semibold text-cream">{formatFecha(contrato.fechaFin)}</p>
              </div>
              <div className="rounded-xl border border-line bg-ink p-3">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-husk">Ubicación</p>
                <p className="text-sm text-cream">{contrato.ubicacion || '—'}</p>
              </div>
              <div className="rounded-xl border border-line bg-ink p-3">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-husk">Precio / colmena</p>
                <p className="text-sm text-cream">{formatSolesPolinizacion(contrato.precioPorColmena)}</p>
              </div>
            </div>

            {/* Colmenas asignadas */}
            <div className="mb-5">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-husk">
                Colmenas asignadas ({contrato.colmenasAsignadas.length})
              </p>
              {contrato.colmenasAsignadas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-ink p-3 text-sm text-husk">
                  Sin colmenas concretas asignadas (se asignan por cantidad).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contrato.colmenasAsignadas.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 rounded-full border border-flower/40 bg-flower/10 px-3 py-1.5 text-xs font-semibold text-flower"
                    >
                      <IconFlower className="h-3.5 w-3.5" />
                      {hiveName(code) ? `${hiveName(code)} (${code})` : code}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
            {contrato.notas && (
              <div className="mb-5 rounded-xl border border-line bg-ink p-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-husk">
                  <IconNote className="h-3 w-3" /> Notas
                </p>
                <p className="whitespace-pre-wrap text-sm text-cream">{contrato.notas}</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              {confirming ? (
                <>
                  <span className="mr-auto text-sm text-coral">¿Eliminar este contrato?</span>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-xl border border-line bg-ink px-4 py-2 text-sm font-semibold text-husk hover:text-cream"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onDelete(contrato.id)}
                    className="flex items-center gap-2 rounded-xl bg-coral px-4 py-2 text-sm font-bold text-ink hover:bg-coral/90"
                  >
                    <IconTrash className="h-4 w-4" /> Eliminar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirming(true)}
                    className="flex items-center gap-2 rounded-xl border border-coral/40 bg-coral/10 px-4 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral/20"
                  >
                    <IconTrash className="h-4 w-4" /> Eliminar
                  </button>
                  <button
                    onClick={() => onEdit(contrato)}
                    className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-honey/90"
                  >
                    <IconEdit className="h-4 w-4" /> Editar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
