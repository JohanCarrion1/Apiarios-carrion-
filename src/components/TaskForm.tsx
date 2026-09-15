import { useState } from "react";
import { motion } from "framer-motion";
import { IconX } from "../ui";
import type { Hive } from "../types/hive";
import { getEntityType } from "../types/hive";

export interface TaskFormData {
  title: string;
  description?: string;
  dueDate: string;
  priority: 'alta' | 'media' | 'baja';
  tipo: 'simple' | 'recurrente';
  recurrencia?: number;
  colmenaId?: string;
  asignado?: string;
}

interface TaskFormProps {
  hives: Hive[];
  onClose: () => void;
  onSave: (data: TaskFormData) => boolean | void;
}

const PRIORITIES: { value: TaskFormData['priority']; label: string; color: string }[] = [
  { value: 'baja', label: 'Baja', color: '#a3906a' },
  { value: 'media', label: 'Media', color: '#f0a41c' },
  { value: 'alta', label: 'Alta', color: '#e4603f' },
];

const RECURRENCIA_OPTIONS = [7, 3, 30, 21];

const today = () => new Date().toISOString().split('T')[0];

export default function TaskForm({ hives, onClose, onSave }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [priority, setPriority] = useState<TaskFormData['priority']>('media');
  const [tipo, setTipo] = useState<TaskFormData['tipo']>('simple');
  const [recurrencia, setRecurrencia] = useState<number>(7);
  const [colmenaId, setColmenaId] = useState('');
  const [asignado, setAsignado] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('El título de la tarea es obligatorio');
      return;
    }

    onSave({
      title: trimmedTitle,
      description: description.trim() || undefined,
      dueDate,
      priority,
      tipo,
      recurrencia: tipo === 'recurrente' ? recurrencia : undefined,
      colmenaId: colmenaId || undefined,
      asignado: asignado.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-husk mb-1">Nueva tarea</p>
          <h3 className="font-display text-xl font-bold text-cream">Crear tarea</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar formulario"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Título de la tarea *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Revisar colmena C-03, Aplicar tratamiento varroa..."
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
          autoFocus
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Detalles, observaciones, material necesario..."
          className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
        />
      </div>

      {/* Fecha de vencimiento */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Fecha de vencimiento
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
        />
      </div>

      {/* Prioridad */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Prioridad
        </label>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <motion.button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                priority === p.value
                  ? 'border-transparent text-ink shadow-[0_4px_16px_rgba(0,0,0,.35)]'
                  : 'border-line text-husk hover:border-honey/50 hover:text-cream'
              }`}
              style={priority === p.value ? { background: p.color } : undefined}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Tipo de tarea
        </label>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            onClick={() => setTipo('simple')}
            className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              tipo === 'simple'
                ? 'border-honey bg-honey/15 text-honey'
                : 'border-line text-husk hover:border-honey/50 hover:text-cream'
            }`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Simple
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setTipo('recurrente')}
            className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              tipo === 'recurrente'
                ? 'border-honey bg-honey/15 text-honey'
                : 'border-line text-husk hover:border-honey/50 hover:text-cream'
            }`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Recurrente
          </motion.button>
        </div>
      </div>

      {/* Recurrencia */}
      {tipo === 'recurrente' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
        >
          <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
            Cada cuántos días
          </label>
          <div className="flex gap-2">
            {RECURRENCIA_OPTIONS.map((days) => (
              <motion.button
                key={days}
                type="button"
                onClick={() => setRecurrencia(days)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                  recurrencia === days
                    ? 'border-honey bg-honey/15 text-honey'
                    : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {days} días
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Colmena asociada */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Colmena asociada (opcional)
        </label>
        <select
          value={colmenaId}
          onChange={(e) => setColmenaId(e.target.value)}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
        >
          <option value="">Sin colmena asociada</option>
          {hives.map((hive) => (
            <option key={hive.id} value={hive.id}>
              {hive.code}{hive.name ? ` · ${hive.name}` : ''} ({getEntityType(hive) === 'nucleo' ? 'núcleo' : 'colmena'})
            </option>
          ))}
        </select>
      </div>

      {/* Asignado a */}
      <div>
        <label className="mb-2 block text-xs font-mono uppercase tracking-widest text-husk">
          Asignado a (opcional)
        </label>
        <input
          type="text"
          value={asignado}
          onChange={(e) => setAsignado(e.target.value)}
          placeholder="Ej: Carlos, Ana..."
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 border-t border-line pt-4">
        <motion.button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-medium text-husk transition-colors hover:bg-pane2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancelar
        </motion.button>
        <motion.button
          type="submit"
          className="flex-1 rounded-xl bg-honey px-4 py-3 text-sm font-semibold text-ink shadow-[0_4px_20px_rgba(240,164,28,.3)] transition-colors hover:bg-honeysoft"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Guardar
        </motion.button>
      </div>
    </form>
  );
}