import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { parseISO } from 'date-fns';
import type { Hive } from '../types/hive';
import type { BreedingLot } from '../types/breeding';
import type {
  Queen,
  QueenOrigin,
  QueenYearColor,
  QueenChangeReason,
} from '../types/queen';
import {
  QUEEN_CHARACTERISTIC_OPTIONS,
  QUEEN_YEAR_COLORS,
  QUEEN_YEAR_COLOR_LABELS,
  QUEEN_CHANGE_REASON_LABELS,
  queenColorForYear,
} from '../types/queen';
import { IconCrown, IconPlus, IconX } from '../ui';
import { BREEDING_STATUS_LABELS } from '../types/breeding';
import { useScrollLock } from '../hooks/useScrollLock';

export interface QueenFormData {
  fechaNacimiento: string;
  origen: QueenOrigin;
  loteId?: string;
  colorAño: QueenYearColor;
  lineaGenetica?: string;
  caracteristicas: string[];
  notas: string;
}

interface QueenFormProps {
  open: boolean;
  hive: Hive | null;
  queen?: Queen | null;
  mode?: 'create' | 'edit' | 'change';
  breedingLots: BreedingLot[];
  getLotLabel: (id: string) => string;
  onClose: () => void;
  onSubmit: (data: QueenFormData, reason?: QueenChangeReason) => void;
}

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70";

export default function QueenForm({
  open,
  hive,
  queen,
  mode = 'create',
  breedingLots,
  getLotLabel,
  onClose,
  onSubmit,
}: QueenFormProps) {
  const defaultDate = toDateStr(new Date());
  const [fechaNacimiento, setFechaNacimiento] = useState(defaultDate);
  const [origen, setOrigen] = useState<QueenOrigin>('propia');
  const [loteId, setLoteId] = useState<string>('');
  const [colorAño, setColorAño] = useState<QueenYearColor>(queenColorForYear(new Date().getFullYear()));
  const [lineaGenetica, setLineaGenetica] = useState('');
  const [caracteristicas, setCaracteristicas] = useState<string[]>([]);
  const [notas, setNotas] = useState('');
  const [reason, setReason] = useState<QueenChangeReason>('recambio');
  const [errors, setErrors] = useState<string[]>([]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    if (queen) {
      setFechaNacimiento(queen.fechaNacimiento);
      setOrigen(queen.origen);
      setLoteId(queen.loteId || '');
      setColorAño(queen.colorAño);
      setLineaGenetica(queen.lineaGenetica || '');
      setCaracteristicas([...queen.caracteristicas]);
      setNotas(queen.notas || '');
    } else {
      const today = toDateStr(new Date());
      setFechaNacimiento(today);
      setOrigen('propia');
      setLoteId('');
      setColorAño(queenColorForYear(new Date().getFullYear()));
      setLineaGenetica('');
      setCaracteristicas([]);
      setNotas('');
    }
    setReason('recambio');
    setErrors([]);
  }, [open, queen]);

  const changeBirthDate = (value: string) => {
    setFechaNacimiento(value);
    if (value && mode !== 'edit') {
      setColorAño(queenColorForYear(parseISO(value).getFullYear()));
    }
  };

  const toggleCaracteristica = (opt: string) => {
    setCaracteristicas(prev =>
      prev.includes(opt) ? prev.filter(c => c !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!fechaNacimiento) errs.push('Ingresa la fecha de nacimiento');
    if (origen === 'lote' && !loteId) errs.push('Selecciona el lote de cría de origen');
    if (origen === 'lote' && !(breedingLots.some(l => l.id === loteId))) errs.push('El lote seleccionado no existe');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit(
      {
        fechaNacimiento,
        origen,
        loteId: origen === 'lote' ? loteId : undefined,
        colorAño,
        lineaGenetica: lineaGenetica.trim() || undefined,
        caracteristicas,
        notas: notas.trim(),
      },
      mode === 'change' ? reason : undefined
    );
  };

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
        className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <IconCrown className="h-5 w-5 text-honey" />
            <h3 className="font-display text-2xl font-bold text-cream">
              {mode === 'change'
                ? `Registrar cambio de reina${hive ? ` · ${hive.code}` : ''}`
                : mode === 'edit'
                ? `Editar reina${hive ? ` · ${hive.code}` : ''}`
                : `Registrar reina${hive ? ` · ${hive.code}` : ''}`}
            </h3>
          </div>
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
          {/* Motivo del cambio (solo modo cambio) */}
          {mode === 'change' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Motivo del cambio</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(QUEEN_CHANGE_REASON_LABELS) as QueenChangeReason[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                      reason === r ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk hover:text-cream'
                    }`}
                  >
                    {QUEEN_CHANGE_REASON_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha de nacimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => changeBirthDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Origen */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Origen</label>
              <div className="flex gap-2">
                {([['propia', 'Propia'], ['comprada', 'Comprada'], ['lote', 'De lote']] as [QueenOrigin, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrigen(value)}
                    className={`flex-1 rounded-xl border py-2 text-sm transition-colors ${
                      origen === value ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk hover:text-cream'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lote de cría */}
          {origen === 'lote' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Lote de cría de reinas
              </label>
              <select
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccionar lote</option>
                {breedingLots.map(lot => (
                  <option key={lot.id} value={lot.id}>
                    {getLotLabel(lot.id)} · {BREEDING_STATUS_LABELS[lot.estado]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Color del año */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Color del año
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(QUEEN_YEAR_COLORS) as QueenYearColor[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorAño(c)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-all ${
                    colorAño === c ? 'border-honey bg-honey/10' : 'border-line hover:border-honey/40'
                  }`}
                >
                  <span
                    className="h-6 w-6 rounded-full border-2 border-ink"
                    style={{ background: QUEEN_YEAR_COLORS[c] }}
                  />
                  <span className={`text-[10px] font-semibold ${colorAño === c ? 'text-honey' : 'text-husk'}`}>
                    {QUEEN_YEAR_COLOR_LABELS[c]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Línea genética */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Línea genética <span className="normal-case text-husk/60">(opcional)</span>
            </label>
            <input
              type="text"
              value={lineaGenetica}
              onChange={(e) => setLineaGenetica(e.target.value)}
              placeholder="Ej: Cárnica, Italiana, Buckfast, Raza local..."
              className={inputCls}
            />
          </div>

          {/* Características */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Características
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUEEN_CHARACTERISTIC_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleCaracteristica(opt)}
                  className={`rounded-xl border px-3 py-2 text-sm text-left transition-all ${
                    caracteristicas.includes(opt)
                      ? 'border-honey bg-honey/10 text-honey'
                      : 'border-line text-husk hover:text-cream hover:border-honey/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                      caracteristicas.includes(opt) ? 'border-honey bg-honey text-ink' : 'border-line'
                    }`}>
                      {caracteristicas.includes(opt) && (
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Notas <span className="normal-case text-husk/60">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre la reina..."
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
              {mode === 'change' ? 'Registrar cambio' : mode === 'edit' ? 'Guardar cambios' : 'Registrar reina'}
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