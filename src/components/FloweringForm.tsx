import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import type { FloweringEntryDraft } from '../types/reminders';
import { FLOWERING_PRESETS, FLOWERING_COLORS } from '../types/reminders';

interface ApiaryOption {
  id: string;
  name: string;
}

interface FloweringFormProps {
  apiaries: ApiaryOption[];
  defaultApiaryName: string;
  onClose: () => void;
  onSave: (draft: FloweringEntryDraft) => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function FloweringForm({
  apiaries,
  defaultApiaryName,
  onClose,
  onSave,
}: FloweringFormProps) {
  const [species, setSpecies] = useState('');
  const [apiaryName, setApiaryName] = useState(defaultApiaryName || apiaries[0]?.name || '');
  const [apiaryId, setApiaryId] = useState(apiaries[0]?.id || '');
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [endMonth, setEndMonth] = useState(Math.min(new Date().getMonth() + 2, 12));
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(FLOWERING_COLORS[0]);

  useScrollLock(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!species.trim() || !apiaryName.trim()) return;
    onSave({
      apiaryId: apiaryId || apiaryName,
      apiaryName: apiaryName.trim(),
      species: species.trim(),
      startMonth,
      endMonth,
      notes: notes.trim() || undefined,
      color,
    });
  };

  const applyPreset = (p: (typeof FLOWERING_PRESETS)[number]) => {
    setSpecies(p.species);
    setStartMonth(p.startMonth);
    setEndMonth(p.endMonth);
    setColor(p.color);
    if (apiaryName.toLowerCase().includes(p.apiaryName.toLowerCase()) || apiaryName.trim() === '') {
      setApiaryName(p.apiaryName);
    }
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
              <h2 className="font-display text-2xl font-bold text-cream">Calendario de floración</h2>
              <p className="text-xs text-husk mt-1">Registra flora melífera por apiario 🌸</p>
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
            {/* Presets conocidos */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Plantas comunes</label>
              <div className="grid grid-cols-3 gap-2">
                {FLOWERING_PRESETS.map((preset) => (
                  <button
                    key={preset.species}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="p-2 rounded-lg border border-line hover:border-honey/50 transition-all text-center"
                  >
                    <span className="text-lg">🌸</span>
                    <span className="block text-xs font-medium text-cream">{preset.species}</span>
                    <span className="block text-[10px] text-husk">
                      {MONTHS[preset.startMonth - 1].slice(0, 3)}-{MONTHS[preset.endMonth - 1].slice(0, 3)} · {preset.apiaryName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Apiario */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Apiario *</label>
                {apiaries.length > 0 ? (
                  <select
                    value={apiaries.find((a) => a.id === apiaryId) ? apiaryId : ''}
                    onChange={(e) => {
                      const opt = apiaries.find((a) => a.id === e.target.value);
                      setApiaryId(e.target.value);
                      setApiaryName(opt?.name || e.target.value);
                    }}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  >
                    {apiaries.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={apiaryName}
                    onChange={(e) => setApiaryName(e.target.value)}
                    placeholder="Nombre del apiario (ej: Huaraz)"
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  />
                )}
              </div>

              {/* Especie */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Especie *</label>
                <input
                  type="text"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  required
                  placeholder="Ej: Eucalipto"
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>
            </div>

            {/* Mes inicio / fin */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Inicio</label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cream mb-2">Fin</label>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 resize-none"
                placeholder="Ej: aumentar revisiones"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Color</label>
              <div className="flex gap-2">
                {FLOWERING_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all border-2 ${
                      color === c ? 'border-cream scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
                className="flex-1 px-4 py-3 rounded-xl bg-honey text-sm font-semibold text-ink hover:bg-honeysoft transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Registrar floración
              </motion.button>
            </div>
          </form>
      </motion.div>
    </motion.div>
  );
}