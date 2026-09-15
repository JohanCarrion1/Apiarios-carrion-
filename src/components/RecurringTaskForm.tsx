import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { RecurringTaskDraft, RecurringTaskFrequency } from '../types/reminders';

interface RecurringTaskFormProps {
  onClose: () => void;
  onCreate: (draft: RecurringTaskDraft) => void;
}

const PRESETS: {
  label: string;
  hint: string;
  intervalDays: number;
  frequency: RecurringTaskFrequency;
  season?: 'all' | 'winter';
}[] = [
  { label: 'Cada 7 días', hint: 'Revisar colmenas', intervalDays: 7, frequency: 'weekly' },
  { label: 'Cada 3 días en invierno', hint: 'Alimentar', intervalDays: 3, frequency: 'custom', season: 'winter' },
  { label: 'Mensual', hint: 'Limpieza de material', intervalDays: 30, frequency: 'monthly' },
  { label: 'Cada 21 días', hint: 'Control de varroa', intervalDays: 21, frequency: 'custom' },
];

export default function RecurringTaskForm({ onClose, onCreate }: RecurringTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [presetIndex, setPresetIndex] = useState<number | null>(0);
  const [intervalDays, setIntervalDays] = useState(7);
  const [frequency, setFrequency] = useState<RecurringTaskFrequency>('weekly');
  const [season, setSeason] = useState<'all' | 'winter'>('all');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [materializeAll, setMaterializeAll] = useState(true);

  const applyPreset = (index: number) => {
    const preset = PRESETS[index];
    setPresetIndex(index);
    setIntervalDays(preset.intervalDays);
    setFrequency(preset.frequency);
    setSeason(preset.season || 'all');
    if (title.trim() === '') {
      setTitle(preset.hint);
      setDescription(`Tarea recurrente: ${preset.hint}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      intervalDays,
      season,
      startDate,
      materializeAll,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-cream">Nueva tarea recurrente</h2>
              <p className="text-xs text-husk mt-1">Se generará automáticamente en el calendario</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                placeholder="Ej: Revisar colmenas"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 resize-none"
                placeholder="Detalles de la tarea..."
              />
            </div>

            {/* Presets de recurrencia */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">
                Frecuencia
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((preset, index) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(index)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      presetIndex === index
                        ? 'border-honey bg-honey/10'
                        : 'border-line hover:border-honey/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-cream">{preset.label}</span>
                    <span className="block text-xs text-husk mt-0.5">{preset.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intervalo personalizado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-husk mb-1">Cada X días</label>
                <input
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => {
                    setIntervalDays(parseInt(e.target.value) || 7);
                    setPresetIndex(null);
                    setFrequency('custom');
                  }}
                  className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>
              <div>
                <label className="block text-xs text-husk mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-cream focus:border-honey/70"
                />
              </div>
            </div>

            {/* Estación */}
            <div>
              <label className="block text-xs text-husk mb-1">Temporada (opcional)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSeason('all')}
                  className={`p-2 rounded-lg border text-xs transition-all ${
                    season === 'all' ? 'border-honey bg-honey/10 text-cream' : 'border-line text-husk'
                  }`}
                >
                  Todo el año
                </button>
                <button
                  type="button"
                  onClick={() => setSeason('winter')}
                  className={`p-2 rounded-lg border text-xs transition-all ${
                    season === 'winter' ? 'border-honey bg-honey/10 text-cream' : 'border-line text-husk'
                  }`}
                >
                  Solo en invierno
                </button>
              </div>
            </div>

            {/* Opción de generación */}
            <div>
              <label className="block text-sm font-medium text-cream mb-2">
                Instancias a generar
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMaterializeAll(true)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    materializeAll ? 'border-honey bg-honey/10' : 'border-line hover:border-honey/50'
                  }`}
                >
                  <span className="text-sm font-medium text-cream">Crear todas las instancias futuras</span>
                  <span className="block text-xs text-husk mt-0.5">
                    Se auto-generan las próximas 4 semanas en el calendario
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMaterializeAll(false)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    !materializeAll ? 'border-honey bg-honey/10' : 'border-line hover:border-honey/50'
                  }`}
                >
                  <span className="text-sm font-medium text-cream">Solo la próxima</span>
                  <span className="block text-xs text-husk mt-0.5">
                    Solo se muestra la siguiente fecha; al cumplirse, se crea la siguiente
                  </span>
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
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
                Crear tarea recurrente
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}