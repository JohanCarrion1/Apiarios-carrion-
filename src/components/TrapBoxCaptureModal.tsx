// ============================================================
// REGISTRO DE CAPTURA DE ENJAMBRE EN UNA CAJA TRAMPA (modal)
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import { IconCheck, IconNote, IconTrap, IconX } from '../ui';
import {
  TRAP_CAPTURE_SIZES,
  TRAP_SIZE_LABELS,
  TRAP_TYPE_DESCRIPTIONS,
  TRAP_TYPE_LABELS,
  todayISO,
  type TrapBox,
  type TrapCapture,
  type TrapCaptureSize,
  type TrapBoxType,
} from '../types/trapBox';

interface Props {
  open: boolean;
  box: TrapBox | null;
  onClose: () => void;
  onSubmit: (capture: TrapCapture, promote: boolean) => Promise<void>;
}

const labelCls =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-husk';
const inputCls =
  'w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/50 outline-none transition-colors focus:border-honey/70';

export default function TrapBoxCaptureModal({ open, box, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(() => todayISO());
  const [type, setType] = useState<TrapBoxType>('APIS');
  const [size, setSize] = useState<TrapCaptureSize>('medium');
  const [notes, setNotes] = useState('');
  const [promote, setPromote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setType(box?.type || 'APIS');
    setSize('medium');
    setNotes('');
    setPromote(false);
    setError(null);
  }, [open, box]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!box) return;
    setError(null);
    try {
      setSaving(true);
      await onSubmit({ date, type, size, notes: notes.trim() }, promote);
      onClose();
    } catch (err) {
      setError((err as Error)?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && box && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-pane p-6 sm:rounded-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-husk">
                  <IconTrap className="h-3 w-3" /> Captura de enjambre
                </p>
                <h3 className="font-display text-2xl font-bold text-cream">
                  Registrar enjambre
                </h3>
                <p className="mt-0.5 text-xs text-husk">
                  {box.name} · {box.id}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Fecha de captura</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tipo de enjambre</label>
                  <select
                    className={inputCls}
                    value={type}
                    onChange={(e) => setType(e.target.value as TrapBoxType)}
                  >
                    {(['APIS', 'MELI'] as TrapBoxType[]).map((t) => (
                      <option key={t} value={t} className="bg-ink text-cream">
                        {TRAP_TYPE_LABELS[t]} — {TRAP_TYPE_DESCRIPTIONS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Tamaño estimado</label>
                <div className="grid grid-cols-3 gap-3">
                  {TRAP_CAPTURE_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        size === s
                          ? 'border-honey bg-honey text-ink'
                          : 'border-line bg-ink text-husk hover:border-honey/50 hover:text-honey'
                      }`}
                    >
                      {TRAP_SIZE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1">
                    <IconNote className="h-3 w-3" /> Observaciones
                  </span>
                </label>
                <textarea
                  className={`${inputCls} min-h-[72px] resize-y`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Comportamiento, panales, reina observada…"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3">
                <input
                  type="checkbox"
                  checked={promote}
                  onChange={(e) => setPromote(e.target.checked)}
                  className="h-4 w-4 accent-honey"
                />
                <span className="text-sm text-cream">
                  Promover a núcleo
                  <span className="ml-1 text-xs text-husk">(crea un núcleo en el sistema)</span>
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-line bg-ink px-5 py-2.5 text-sm font-semibold text-husk transition-colors hover:text-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honey/90 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink" />
                  ) : (
                    <>
                      <IconCheck className="h-4 w-4" /> Registrar captura
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
