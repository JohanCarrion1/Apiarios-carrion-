import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import type { Fecundador, FecundadorQueenState } from '../types/fecundador';
import {
  FECUNDADOR_STATE_LABELS,
  FECUNDADOR_STATE_COLORS,
  FECUNDADOR_STATE_ORDER,
  fecundadorStateIndex,
} from '../types/fecundador';
import InspectionPhotoUploader, {
  type InspectionPhotoUploaderHandle,
} from './InspectionPhotoUploader';

export interface FecundadorInspectionDraft {
  /** Fecha de la inspección (yyyy-MM-dd). */
  fecha: string;
  queenState: FecundadorQueenState;
  observaciones: string;
  /** URLs de Cloudinary de las fotos de la inspección. */
  photos: string[];
  /** Próxima revisión programada (yyyy-MM-dd). */
  proximaRevision?: string;
  /** Marcar para promover a núcleo tras la inspección (solo si reina en puesta). */
  promover: boolean;
}

interface FecundadorInspectionModalProps {
  open: boolean;
  fecundador: Fecundador | null;
  nextNucleoCode?: string;
  onClose: () => void;
  onSubmit: (d: FecundadorInspectionDraft) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function FecundadorInspectionModal({
  open,
  fecundador,
  nextNucleoCode = '',
  onClose,
  onSubmit,
}: FecundadorInspectionModalProps) {
  const [fecha, setFecha] = useState(today());
  const [queenState, setQueenState] = useState<FecundadorQueenState>('celda_real');
  const [observaciones, setObservaciones] = useState('');
  const [proximaRevision, setProximaRevision] = useState<string>('');
  const [promover, setPromover] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoUploaderRef = useRef<InspectionPhotoUploaderHandle>(null);

  useScrollLock(open);

  // Reset del formulario cada vez que se abre para el fecundador indicado.
  useEffect(() => {
    if (open && fecundador) {
      setFecha(today());
      setQueenState(fecundador.queenState);
      setObservaciones('');
      setProximaRevision(fecundador.proximaRevision || '');
      setPromover(false);
      setPhotos([]);
    }
  }, [open, fecundador]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canPromote = !!fecundador && fecundador.estado === 'activo' && queenState === 'en_puesta';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !fecundador) return;
    setSubmitting(true);

    let uploadedPhotos = photos;
    const uploader = photoUploaderRef.current;
    if (uploader?.hasPending()) {
      const res = await uploader.uploadPending();
      if (!res) {
        setSubmitting(false);
        return;
      }
      uploadedPhotos = res;
    }

    // La fecha elegida se guarda a las 12:00 para que el historial la
    // ordene bien y `parseISO` la formatee sin saltos de día por zona horaria.
    const fechaISO = new Date(`${fecha}T12:00:00`).toISOString();

    onSubmit({
      fecha: fechaISO,
      queenState,
      observaciones: observaciones.trim(),
      photos: uploadedPhotos,
      proximaRevision: proximaRevision || undefined,
      promover: canPromote && promover,
    });
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && fecundador && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm touch-none"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            >
              <div className="flex items-start justify-between border-b border-line px-6 pb-5 pt-6 sm:px-8">
                <div>
                  <p className="tick-label mb-1.5">
                    {fecundador.code} · Baby nuc
                  </p>
                  <h3 className="font-display text-3xl font-black tracking-tight text-cream">
                    Nueva inspección
                  </h3>
                </div>
                <motion.button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                  {/* Fecha de la inspección */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Fecha</span>
                      <input
                        type="date"
                        value={fecha}
                        max={today()}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm font-semibold text-cream focus:border-honey/70"
                      />
                    </div>
                    <div>
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">
                        Próxima revisión programada
                      </span>
                      <input
                        type="date"
                        value={proximaRevision}
                        min={fecha || today()}
                        onChange={(e) => setProximaRevision(e.target.value)}
                        className="w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm font-semibold text-cream focus:border-honey/70"
                      />
                    </div>
                  </div>

                  {/* Estado observado de la reina: progresión natural del ciclo */}
                  <div>
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">
                      Estado de la reina observado
                    </span>
                    <div className="mb-3 flex gap-1.5">
                      {FECUNDADOR_STATE_ORDER.map((s, idx) => {
                        const color = FECUNDADOR_STATE_COLORS[s];
                        const done = idx <= fecundadorStateIndex(queenState);
                        const isCurrent = queenState === s;
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
                    <div className="grid grid-cols-2 gap-2">
                      {FECUNDADOR_STATE_ORDER.map((s) => {
                        const color = FECUNDADOR_STATE_COLORS[s];
                        const selected = queenState === s;
                        return (
                          <motion.button
                            key={s}
                            type="button"
                            onClick={() => setQueenState(s)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 ${
                              selected
                                ? 'text-ink shadow'
                                : 'border-line text-husk hover:text-cream'
                            }`}
                            style={
                              selected
                                ? { background: color, borderColor: color }
                                : { borderColor: `${color}55` }
                            }
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: selected ? 'rgba(0,0,0,.35)' : color }}
                            />
                            {FECUNDADOR_STATE_LABELS[s]}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Promover a núcleo (solo si la reina está en puesta) */}
                  {canPromote && (
                    <label
                      className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                        promover
                          ? 'border-sage/60 bg-sage/10 text-sage'
                          : 'border-line bg-ink/50 text-husk hover:border-sage/40 hover:text-cream'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={promover}
                        onChange={(e) => setPromover(e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-[#a3bf7f]"
                      />
                      <span className="font-semibold">
                        Promover a núcleo tras esta inspección
                        {nextNucleoCode ? ` (será ${nextNucleoCode})` : ''}
                      </span>
                    </label>
                  )}

                  {/* Observaciones */}
                  <div>
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">
                      Observaciones
                    </span>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      placeholder="Puesta, vigor, cría, reservas, alimentación, manejo…"
                      className="w-full resize-none rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                    />
                  </div>

                  {/* Fotos de la inspección */}
                  <div className="border-t border-line pt-6">
                    <InspectionPhotoUploader
                      ref={photoUploaderRef}
                      value={photos}
                      onChange={setPhotos}
                      onUploadingChange={setPhotosUploading}
                    />
                  </div>
                </div>

                <div className="border-t border-line px-6 py-4 sm:px-8">
                  <motion.button
                    type="submit"
                    disabled={photosUploading || submitting}
                    className="w-full rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(240,164,28,.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {photosUploading || submitting ? 'Subiendo fotos…' : 'Guardar inspección'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}