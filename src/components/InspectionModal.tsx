import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import type { Hive, Inspection, BroodPattern } from '../types/hive';
import InspectionPhotoUploader, {
  type InspectionPhotoUploaderHandle,
} from './InspectionPhotoUploader';

export interface InspectionDraft {
  hiveId: string;
  queenSeen: boolean;
  brood: number;
  honey: number;
  varroa: number;
  calm: 1 | 2 | 3;
  note: string;
  photos?: string[];
  orphanColony?: boolean;
  framesMounted?: number;
  framesWorked?: number;
  broodPattern?: BroodPattern;
  hasSupers?: boolean;
}

interface InspectionModalProps {
  open: boolean;
  hives: Hive[];
  /** Inspecciones guardadas: el formulario arranca con los valores de la última de cada unidad. */
  inspections?: Inspection[];
  initialHive: string;
  onClose: () => void;
  onSubmit: (d: InspectionDraft) => void;
}

// ============================================================
// LÍMITES FÍSICOS DE CUADROS
// ============================================================
// Una colmena admite 10 cuadros; un núcleo (o un fecundador) tiene cuerpo
// reducido y solo 5. El mismo modal atiende colmenas y núcleos, así que el
// tope se calcula sobre el ELEMENTO SELECCIONADO, no sobre la lista.
const MAX_CUADROS_COLMENA = 10;
const MAX_CUADROS_NUCLEO = 5;

function Slider({
  label,
  value,
  max,
  step = 1,
  unit,
  accent = '#ffd061',
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

export default function InspectionModal({ open, hives, inspections = [], initialHive, onClose, onSubmit }: InspectionModalProps) {
  const [hiveId, setHiveId] = useState(initialHive || '');
  const [queenSeen, setQueenSeen] = useState(true);
  const [brood, setBrood] = useState(5);
  const [honey, setHoney] = useState(4);
  const [varroa, setVarroa] = useState(1);
  const [calm, setCalm] = useState<1 | 2 | 3>(2);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoUploaderRef = useRef<InspectionPhotoUploaderHandle>(null);
  const [orphanColony, setOrphanColony] = useState(false);
  const [framesMounted, setFramesMounted] = useState(0);
  const [framesWorked, setFramesWorked] = useState(0);
  const [broodPattern, setBroodPattern] = useState<BroodPattern>('uniforme');
  const [hasSupers, setHasSupers] = useState(false);

  useScrollLock(open);

  // Fecha de la inspección guardada que sirvió de base (null = valores por defecto).
  const [baseFecha, setBaseFecha] = useState<string | null>(null);
  // Se lee por ref: guardar una inspección cambia el array y no debe reiniciar
  // el formulario que el usuario está rellenando.
  const inspeccionesRef = useRef(inspections);
  inspeccionesRef.current = inspections;
  const hivesRef = useRef(hives);
  hivesRef.current = hives;

  const numero = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);

  // Carga en el formulario los valores GUARDADOS de la última inspección de la
  // unidad (la base de datos manda). Sin inspecciones previas, valores por defecto.
  const aplicarBase = (id: string) => {
    const ultima = inspeccionesRef.current
      .filter((i) => i.hiveId === id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const unidad = hivesRef.current.find((h) => h.id === id);
    setOrphanColony(unidad?.hasQueen === false);
    if (ultima) {
      setQueenSeen(!!ultima.queenSeen);
      setBrood(numero(ultima.brood, 5));
      setHoney(numero(ultima.honey, 4));
      setVarroa(numero(ultima.varroa, 1));
      setCalm(ultima.calm === 1 || ultima.calm === 3 ? ultima.calm : 2);
      setFramesMounted(numero(ultima.framesMounted, 0));
      setFramesWorked(numero(ultima.framesWorked, 0));
      setBroodPattern(ultima.broodPattern ?? 'uniforme');
      setHasSupers(!!ultima.hasSupers);
      setBaseFecha(ultima.date);
    } else {
      setQueenSeen(true);
      setBrood(5);
      setHoney(4);
      setVarroa(1);
      setCalm(2);
      setFramesMounted(0);
      setFramesWorked(0);
      setBroodPattern('uniforme');
      setHasSupers(false);
      setBaseFecha(null);
    }
  };

  useEffect(() => {
    if (open) {
      setHiveId(initialHive);
      aplicarBase(initialHive);
      setNote('');
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialHive]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ============================================================
  // CAPACIDAD DINÁMICA SEGÚN EL ELEMENTO SELECCIONADO
  // ============================================================
  const elementoSeleccionado = hives.find((h) => h.id === hiveId) || null;

  // `entityType` es la fuente fiable. El prefijo del `code` (C-/N-/F-) actúa
  // de red de seguridad para registros antiguos que no tengan el campo:
  // OJO, el prefijo NO está en el `id` (los id son uid() aleatorios).
  const maxCuadros = (() => {
    const sel = elementoSeleccionado;
    if (!sel) return MAX_CUADROS_COLMENA;
    if (sel.entityType) {
      return sel.entityType === 'nucleo' ? MAX_CUADROS_NUCLEO : MAX_CUADROS_COLMENA;
    }
    return /^(N|F)-/i.test(sel.code) ? MAX_CUADROS_NUCLEO : MAX_CUADROS_COLMENA;
  })();

  // Si se baja de capacidad (p. ej. se venía de una colmena con 8 cuadros y
  // se selecciona un núcleo de 5), los valores que quedaran por encima se
  // recortan: nunca se puede guardar ni mostrar un conteo sobre el tope
  // físico del elemento. Actualización funcional: no re-renderiza si el
  // valor ya era válido.
  useEffect(() => {
    setBrood((v) => (v > maxCuadros ? maxCuadros : v));
    setHoney((v) => (v > maxCuadros ? maxCuadros : v));
    setFramesMounted((v) => (v > maxCuadros ? maxCuadros : v));
    setFramesWorked((v) => (v > maxCuadros ? maxCuadros : v));
  }, [maxCuadros]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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

    console.log('📝 [INSPECTION] Enviando inspección con', uploadedPhotos.length, 'fotos');
    onSubmit({
      hiveId,
      queenSeen,
      brood,
      honey,
      varroa,
      calm,
      note: note.trim() || 'Sin observaciones.',
      photos: uploadedPhotos,
      orphanColony,
      framesMounted,
      framesWorked,
      broodPattern,
      hasSupers,
    });
    setSubmitting(false);
  };

  // Log para debug de fotos
  useEffect(() => {
    console.log('📸 [INSPECTION] Estado de fotos actualizado:', photos.length, 'fotos');
  }, [photos]);

  return (
    <AnimatePresence>
      {open && (
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

              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                {baseFecha && (
                  <p className="rounded-lg border border-honey/30 bg-honey/10 px-3 py-2 text-xs text-honey">
                    Partiendo de la última inspección guardada ({new Date(baseFecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}). Ajusta lo que haya cambiado.
                  </p>
                )}
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Colmena</span>
                      <select
                        value={hiveId}
                        onChange={(e) => {
                          setHiveId(e.target.value);
                          aplicarBase(e.target.value);
                        }}
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
                  </div>

                  {/* Colonia huérfana */}
                  <label
                    className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                      orphanColony
                        ? 'border-[#c987c3]/60 bg-[#c987c3]/10 text-[#c987c3]'
                        : 'border-line bg-ink/50 text-husk hover:border-[#c987c3]/40 hover:text-cream'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={orphanColony}
                      onChange={(e) => setOrphanColony(e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-[#c987c3]"
                    />
                    <span className="font-semibold">Colonia huérfana (sin reina)</span>
                    {orphanColony && <span className="ml-auto text-xs">⚠️ Estado SIN REINA</span>}
                  </label>
                </div>

                <div>
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
                </div>

                {/* SECCIÓN: Capacidad (Nido) */}
                <div className="space-y-5 rounded-xl border border-line bg-ink/50 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-husk">Capacidad (Nido)</p>
                  <Slider label="Cuadros montados (Total)" value={framesMounted} max={maxCuadros} unit=" cuadros" onChange={setFramesMounted} />
                  <Slider label="Cuadros trabajados" value={framesWorked} max={maxCuadros} unit=" cuadros" onChange={setFramesWorked} />
                </div>

                {/* SECCIÓN: Salud de la Reina */}
                <div>
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Salud de la reina</span>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-husk">Patrón de postura</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 'uniforme', label: 'Uniforme' },
                      { v: 'fallada', label: 'Fallada' },
                      { v: 'zanganera', label: 'Zanganera' },
                    ] as const).map((o) => (
                      <motion.button
                        key={o.v}
                        type="button"
                        onClick={() => setBroodPattern(o.v)}
                        className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 ${
                          broodPattern === o.v ? 'border-honey bg-honey/15 text-honey' : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {o.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5 rounded-xl border border-line bg-ink/50 p-5">
                  <Slider label="Cuadros de cría" value={brood} max={maxCuadros} unit=" cuadros" onChange={setBrood} />
                  <Slider label="Cuadros de miel" value={honey} max={maxCuadros} unit=" cuadros" onChange={setHoney} />
                  <Slider
                    label="Varroa (test de azúcar)"
                    value={varroa}
                    max={5}
                    step={0.1}
                    unit="%"
                    accent={varroa < 1.5 ? '#93cc68' : varroa < 2.5 ? '#ffa90a' : '#f4552b'}
                    onChange={setVarroa}
                  />
                </div>

                {/* SECCIÓN: Estructura */}
                <div>
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Estructura</span>
                  <span className="mb-2 block text-xs text-husk">¿Tiene sobre-nido / alza?</span>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: true, label: 'Sí' },
                      { v: false, label: 'No' },
                    ] as const).map((o) => (
                      <motion.button
                        key={o.label}
                        type="button"
                        onClick={() => setHasSupers(o.v)}
                        className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 ${
                          hasSupers === o.v ? 'border-honey bg-honey/15 text-honey' : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {o.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-husk">Observaciones</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Puesta, reservas, piquera, tratamientos…"
                    className="w-full resize-none rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                  />
                </div>

                {/* Sección de Fotos */}
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
                    className="w-full rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(255,169,10,.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {photosUploading || submitting ? 'Subiendo fotos…' : 'Guardar en el cuaderno'}
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
