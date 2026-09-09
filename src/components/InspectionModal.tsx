import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Hive, Inspection } from '../types/hive';
import type { PhotoData } from '../services/photos';
import PhotoUploader from './PhotoUploader';

export interface InspectionDraft {
  hiveId: string;
  queenSeen: boolean;
  brood: number;
  honey: number;
  varroa: number;
  calm: 1 | 2 | 3;
  note: string;
  photos?: PhotoData[];
}

interface InspectionModalProps {
  open: boolean;
  hives: Hive[];
  initialHive: string;
  onClose: () => void;
  onSubmit: (d: InspectionDraft) => void;
}

function Slider({
  label,
  value,
  max,
  step = 1,
  unit,
  accent = '#ffc961',
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  unit: string;
  accent?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-husk">{label}</span>
        <motion.span
          className="font-mono text-sm font-bold"
          style={{ color: accent }}
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {step < 1 ? value.toFixed(1) : value}
          {unit}
        </motion.span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${(value / max) * 100}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function InspectionModal({ open, hives, initialHive, onClose, onSubmit }: InspectionModalProps) {
  const [hiveId, setHiveId] = useState(initialHive || '');
  const [queenSeen, setQueenSeen] = useState(true);
  const [brood, setBrood] = useState(5);
  const [honey, setHoney] = useState(4);
  const [varroa, setVarroa] = useState(1);
  const [calm, setCalm] = useState<1 | 2 | 3>(2);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  useEffect(() => {
    if (open) {
      setHiveId(initialHive);
      setQueenSeen(true);
      setBrood(5);
      setHoney(4);
      setVarroa(1);
      setCalm(2);
      setNote('');
      setPhotos([]);
    }
  }, [open, initialHive]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hiveId,
      queenSeen,
      brood,
      honey,
      varroa,
      calm,
      note: note.trim() || 'Sin observaciones.',
      photos,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="card relative max-h-[92vh] w-full max-w-xl overflow-y-auto p-6 shadow-[0_30px_80px_rgba(0,0,0,.6)] sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="tick-label mb-1.5">Nueva inspección</p>
                  <h3 className="font-display text-3xl font-black tracking-tight text-cream">Parte de colmena</h3>
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

              <form onSubmit={submit} className="space-y-6">
                <motion.div
                  className="grid gap-4 sm:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div>
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Colmena</span>
                    <select
                      value={hiveId}
                      onChange={(e) => setHiveId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm font-semibold text-cream focus:border-honey/70"
                    >
                      {hives.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Reina</span>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-ink p-1">
                      {[
                        { v: true, label: 'Vista' },
                        { v: false, label: 'No vista' },
                      ].map((o) => (
                        <motion.button
                          key={o.label}
                          type="button"
                          onClick={() => setQueenSeen(o.v)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                            queenSeen === o.v ? 'bg-honey text-ink shadow' : 'text-husk hover:text-cream'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {o.v && <span>👑</span>}
                          {o.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-5 rounded-xl border border-line bg-ink/50 p-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Slider label="Cuadros de cría" value={brood} max={10} unit=" cuadros" onChange={setBrood} />
                  <Slider label="Cuadros de miel" value={honey} max={10} unit=" cuadros" onChange={setHoney} />
                  <Slider
                    label="Varroa (test de azúcar)"
                    value={varroa}
                    max={5}
                    step={0.1}
                    unit="%"
                    accent={varroa < 1.5 ? '#a3bf7f' : varroa < 2.5 ? '#f0a41c' : '#e4603f'}
                    onChange={setVarroa}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Temperamento</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 1, label: 'Mansa' },
                      { v: 2, label: 'Normal' },
                      { v: 3, label: 'Nerviosa' },
                    ] as const).map((o) => (
                      <motion.button
                        key={o.v}
                        type="button"
                        onClick={() => setCalm(o.v)}
                        className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 ${
                          calm === o.v ? 'border-honey bg-honey/15 text-honey' : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {o.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Observaciones</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Puesta, reservas, piquera, tratamientos…"
                    className="w-full resize-none rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                  />
                </motion.div>

                {/* Sección de Fotos */}
                <motion.div
                  className="border-t border-line pt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
                </motion.div>

                <motion.button
                  type="submit"
                  className="w-full rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(240,164,28,.4)] active:scale-[0.98]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Guardar en el cuaderno
                </motion.button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
