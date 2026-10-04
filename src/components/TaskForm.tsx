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
  initialTitle?: string;
}

const PRIORITIES: { value: TaskFormData['priority']; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

const RECURRENCIA_OPTIONS = [7, 3, 30, 21];

const today = () => new Date().toISOString().split('T')[0];

const inputClass =
  'w-full rounded-xl border border-[#4A3A24] bg-[#1F1811] px-4 py-3 text-sm text-[#F5EFE0] placeholder:text-[#B8A888]/60 focus:border-[#F5A623]';

const labelClass =
  'mb-2 block text-xs font-mono uppercase tracking-widest text-[#B8A888]';

const chipClass = (selected: boolean) =>
  `flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
    selected
      ? 'border-transparent shadow-[0_4px_16px_rgba(0,0,0,.35)]'
      : 'border-[#4A3A24] text-[#B8A888] hover:border-[#F5A623]/50 hover:text-[#F5EFE0]'
  }`;

export default function TaskForm({ hives, onClose, onSave, initialTitle }: TaskFormProps) {
  const [title, setTitle] = useState(initialTitle ?? '');
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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      {/* Encabezado FIJO */}
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: 'rgba(245,158,11,0.2)' }}
      >
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#B8A888]">Nueva tarea</p>
          <h2 className="text-xl font-bold" style={{ color: '#F5EFE0' }}>Crear tarea</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar formulario"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ color: '#B8A888' }}
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {/* Cuerpo SCROLLEABLE */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error && (
          <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
            {error}
          </div>
        )}

        {/* Título */}
        <div>
          <label className={labelClass}>
            Título de la tarea *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Revisar colmena C-03, Aplicar tratamiento varroa..."
            className={inputClass}
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div>
          <label className={labelClass}>
            Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Detalles, observaciones, material necesario..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Fecha de vencimiento */}
        <div>
          <label className={labelClass}>
            Fecha de vencimiento
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Prioridad */}
        <div>
          <label className={labelClass}>
            Prioridad
          </label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <motion.button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={chipClass(priority === p.value)}
                style={priority === p.value ? { background: '#F5A623', color: '#1F1811' } : undefined}
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
          <label className={labelClass}>
            Tipo de tarea
          </label>
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              onClick={() => setTipo('simple')}
              className={chipClass(tipo === 'simple')}
              style={tipo === 'simple' ? { background: '#F5A623', color: '#1F1811' } : undefined}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Simple
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setTipo('recurrente')}
              className={chipClass(tipo === 'recurrente')}
              style={tipo === 'recurrente' ? { background: '#F5A623', color: '#1F1811' } : undefined}
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
            <label className={labelClass}>
              Cada cuántos días
            </label>
            <div className="flex gap-2">
              {RECURRENCIA_OPTIONS.map((days) => (
                <motion.button
                  key={days}
                  type="button"
                  onClick={() => setRecurrencia(days)}
                  className={chipClass(recurrencia === days)}
                  style={recurrencia === days ? { background: '#F5A623', color: '#1F1811' } : undefined}
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
          <label className={labelClass}>
            Colmena asociada (opcional)
          </label>
          <select
            value={colmenaId}
            onChange={(e) => setColmenaId(e.target.value)}
            className={inputClass}
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
          <label className={labelClass}>
            Asignado a (opcional)
          </label>
          <input
            type="text"
            value={asignado}
            onChange={(e) => setAsignado(e.target.value)}
            placeholder="Ej: Carlos, Ana..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Pie FIJO */}
      <div
        className="flex gap-3 border-t px-5 py-4"
        style={{ borderColor: 'rgba(245,158,11,0.2)' }}
      >
        <motion.button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border py-3 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#B8A888' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancelar
        </motion.button>
        <motion.button
          type="submit"
          className="flex-1 rounded-xl py-3 text-sm font-semibold"
          style={{ backgroundColor: '#F5A623', color: '#1F1811' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Guardar
        </motion.button>
      </div>
    </form>
  );
}