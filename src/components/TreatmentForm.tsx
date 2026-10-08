import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { backdropVariants, modalVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import type { TreatmentDraft } from '../types/hive';
import { TREATMENT_PRESETS, safeHarvestDate, daysUntilSafeHarvest } from '../utils/treatments';

export interface ColonyOption {
  id: string;
  label: string;
}

interface TreatmentFormProps {
  colonies: ColonyOption[];
  defaultHiveId?: string;
  onClose: () => void;
  onSave: (draft: TreatmentDraft) => void;
}

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function TreatmentForm({
  colonies,
  defaultHiveId,
  onClose,
  onSave,
}: TreatmentFormProps) {
  const [hiveId, setHiveId] = useState(defaultHiveId || 'apiario');
  const [product, setProduct] = useState('');
  const [dose, setDose] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [waitingDays, setWaitingDays] = useState(7);
  const [notes, setNotes] = useState('');

  useScrollLock(true);

  // Fecha en la que ya se podría cosechar (previsualización en vivo)
  const preview = (() => {
    if (!startDate) return null;
    try {
      const fake = { startDate, endDate: endDate || undefined, waitingDays } as Parameters<typeof safeHarvestDate>[0];
      const safe = safeHarvestDate(fake);
      return { label: format(safe, 'dd/MM/yyyy'), daysLeft: daysUntilSafeHarvest(fake) };
    } catch {
      return null;
    }
  })();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!product.trim() || !startDate) return;
    onSave({
      hiveId: hiveId || 'apiario',
      product: product.trim(),
      dose: dose.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      waitingDays: Math.max(0, Number(waitingDays) || 0),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card relative flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-cream">Registrar tratamiento</h2>
            <p className="text-xs text-husk mt-1">Control de varroa y período de espera 🛡️</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Productos comunes */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Productos comunes</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TREATMENT_PRESETS.map((p) => (
                  <button
                    key={p.product}
                    type="button"
                    onClick={() => {
                      setProduct(p.product);
                      setWaitingDays(p.waitingDays);
                    }}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      product === p.product
                        ? 'border-honey bg-honey/10'
                        : 'border-line hover:border-honey/50'
                    }`}
                  >
                    <span className="block text-xs font-medium text-cream">{p.product}</span>
                    <span className="block text-[10px] text-husk">espera {p.waitingDays} d</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Colmena / núcleo */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Colmena *</label>
                <select
                  value={hiveId}
                  onChange={(e) => setHiveId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                >
                  <option value="apiario">Todo el apiario</option>
                  {colonies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Producto *</label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ej: Amitraz, timol, ácido oxálico…"
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>

              {/* Dosis */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Dosis / presentación</label>
                <input
                  type="text"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="Ej: 1 tira por colmena"
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>

              {/* Días de espera */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Período de espera (días) *</label>
                <input
                  type="number"
                  min={0}
                  value={waitingDays}
                  onChange={(e) => setWaitingDays(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
                <p className="text-[10px] text-husk mt-1">Días sin cosechar tras el fin del tratamiento</p>
              </div>

              {/* Fechas */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Inicio *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Fin (opcional)</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>
            </div>

            {/* Aviso de espera calculado */}
            {preview && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  preview.daysLeft <= 0
                    ? 'border-sage/40 bg-sage/10 text-sage'
                    : 'border-honey/40 bg-honey/10 text-honey'
                }`}
              >
                {preview.daysLeft <= 0
                  ? `✅ Seguro para cosechar desde el ${preview.label}`
                  : `⏳ Seguro para cosechar el ${preview.label} (faltan ${preview.daysLeft} ${preview.daysLeft === 1 ? 'día' : 'días'})`}
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones del tratamiento…"
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 border-t border-line px-6 py-4">
            <motion.button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-line text-sm font-medium text-husk hover:bg-ink/50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancelar
            </motion.button>
            <motion.button
              type="submit"
              disabled={!product.trim() || !startDate}
              className="flex-1 px-4 py-3 rounded-xl bg-honey text-sm font-semibold text-ink hover:bg-honeysoft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Registrar tratamiento
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
