import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { format } from 'date-fns';
import type { BreedingLot } from '../types/breeding';
import type { Fecundador, FecundadorQueenState } from '../types/fecundador';
import { FECUNDADOR_STATE_LABELS, FECUNDADOR_STATE_ORDER, fecundadorStateDateField } from '../types/fecundador';
import { IconPlus, IconX } from '../ui';
import { useScrollLock } from '../hooks/useScrollLock';

export interface FecundadorFormData {
  code: string;
  name?: string;
  location?: string;
  breedingLotId?: string;
  queenState: FecundadorQueenState;
  fechaCelda?: string;
  fechaNacimiento?: string;
  fechaFecundacion?: string;
  fechaPuesta?: string;
  notes?: string;
}

interface FecundadorFormProps {
  breedingLots: BreedingLot[];
  nextCode: string;
  existingCodes: string[];
  fecundador?: Fecundador | null;
  onClose: () => void;
  onSave: (data: FecundadorFormData) => void;
}

const toDateStr = (date: Date) => format(date, 'yyyy-MM-dd');

export default function FecundadorForm({
  breedingLots,
  nextCode,
  existingCodes = [],
  fecundador,
  onClose,
  onSave,
}: FecundadorFormProps) {
  const isEdit = !!fecundador;
  const [code, setCode] = useState<string>(fecundador?.code || nextCode);
  const [name, setName] = useState<string>(fecundador?.name || '');
  const [location, setLocation] = useState<string>(fecundador?.location || '');
  const [breedingLotId, setBreedingLotId] = useState<string>(fecundador?.breedingLotId || '');
  const [queenState, setQueenState] = useState<FecundadorQueenState>(fecundador?.queenState || 'celda_real');
  const [fechaCelda, setFechaCelda] = useState<string>(fecundador?.fechaCelda || toDateStr(new Date()));
  const [fechaNacimiento, setFechaNacimiento] = useState<string>(fecundador?.fechaNacimiento || '');
  const [fechaFecundacion, setFechaFecundacion] = useState<string>(fecundador?.fechaFecundacion || '');
  const [fechaPuesta, setFechaPuesta] = useState<string>(fecundador?.fechaPuesta || '');
  const [notes, setNotes] = useState<string>(fecundador?.notes || '');
  const [errors, setErrors] = useState<string[]>([]);

  const getLotLabel = (id: string) => {
    const lot = breedingLots.find(l => l.id === id);
    return lot
      ? `Lote ${id.slice(-6).toUpperCase()} · ${lot.tipo}`
      : `Lote ${id.slice(-6).toUpperCase()}`;
  };

  const changeState = (state: FecundadorQueenState) => {
    setQueenState(state);
    // Autocompletar la fecha de la etapa elegida si está vacía
    const field = fecundadorStateDateField[state];
    if (state === 'celda_real' && !fechaCelda) setFechaCelda(toDateStr(new Date()));
    if (state === 'virgen' && !fechaNacimiento && field === 'fechaNacimiento') setFechaNacimiento(toDateStr(new Date()));
    if (state === 'fecundada' && !fechaFecundacion && field === 'fechaFecundacion') setFechaFecundacion(toDateStr(new Date()));
    if (state === 'en_puesta' && !fechaPuesta && field === 'fechaPuesta') setFechaPuesta(toDateStr(new Date()));
  };

  const handleSubmit = () => {
    const errs: string[] = [];
    const normCode = code.trim().toUpperCase();
    if (!normCode) errs.push('El código es obligatorio');
    else if (existingCodes.includes(normCode) && normCode !== fecundador?.code) {
      errs.push(`El código ${normCode} ya existe`);
    }
    if (!/^F(-\d{2,3})?$/.test(normCode)) errs.push('El código debe tener formato F-XX (ej: F-01)');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onSave({
      code: normCode,
      name: name.trim() || undefined,
      location: location.trim() || undefined,
      breedingLotId: breedingLotId || undefined,
      queenState,
      fechaCelda: fechaCelda || undefined,
      fechaNacimiento: fechaNacimiento || undefined,
      fechaFecundacion: fechaFecundacion || undefined,
      fechaPuesta: fechaPuesta || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70";

  useScrollLock(true);

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h3 className="font-display text-2xl font-bold text-cream">
            {isEdit ? `Editar ${fecundador?.code}` : 'Nuevo Fecundador'}
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-5 h-5 text-cream" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-coral/50 bg-coral/10">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-coral">{error}</p>
            ))}
          </div>
        )}

        <div className="space-y-5">
          {/* Código */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Código (F-XX)
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="F-01"
            />
            {!isEdit && (
              <p className="mt-1 text-[11px] text-husk">Siguiente código disponible: {nextCode}</p>
            )}
          </div>

          {/* Nombre y ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Nombre <span className="normal-case text-husk/60">(opcional)</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Ej: Baby nuc - línea Buckfast"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Ubicación <span className="normal-case text-husk/60">(opcional)</span>
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputCls}
                placeholder="Ej: Fila 2, cerca del arroyo"
              />
            </div>
          </div>

          {/* Lote de cría */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Vínculo con lote de cría <span className="normal-case text-husk/60">(opcional)</span>
            </label>
            <select
              value={breedingLotId}
              onChange={(e) => setBreedingLotId(e.target.value)}
              className={inputCls}
            >
              <option value="">Sin vínculo</option>
              {breedingLots.map(lot => (
                <option key={lot.id} value={lot.id}>{getLotLabel(lot.id)}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-husk">Vincula la celda real o la reina de este baby nuc a un lote de la pestaña Cría.</p>
          </div>

          {/* Estado de la reina */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Estado de la reina
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FECUNDADOR_STATE_ORDER.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeState(s)}
                  className={`rounded-xl border py-2 px-2 text-xs sm:text-sm font-semibold transition-all text-center ${
                    queenState === s
                      ? 'border-honey bg-honey/10 text-honey'
                      : 'border-line text-husk hover:text-cream hover:border-honey/40'
                  }`}
                >
                  <span className="block font-mono text-[9px] text-husk/70">Etapa {idx + 1}</span>
                  {FECUNDADOR_STATE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas del ciclo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Instalación de celda</label>
              <input type="date" value={fechaCelda} onChange={(e) => setFechaCelda(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Nacimiento (virgen)</label>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className={inputCls} disabled={!fechaNacimiento && queenState === 'celda_real'} />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Fecundación</label>
              <input type="date" value={fechaFecundacion} onChange={(e) => setFechaFecundacion(e.target.value)} className={inputCls} disabled={!fechaFecundacion && (queenState === 'celda_real' || queenState === 'virgen')} />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Inicio de puesta</label>
              <input type="date" value={fechaPuesta} onChange={(e) => setFechaPuesta(e.target.value)} className={inputCls} disabled={!fechaPuesta && queenState !== 'en_puesta'} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Notas <span className="normal-case text-husk/60">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el baby nuc..."
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <motion.button
              onClick={handleSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-honey py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconPlus className="h-4 w-4" />
              {isEdit ? 'Guardar cambios' : 'Crear fecundador'}
            </motion.button>
            <motion.button
              onClick={onClose}
              className="px-6 rounded-xl border border-line py-2.5 text-sm font-medium text-husk hover:bg-ink/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancelar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}